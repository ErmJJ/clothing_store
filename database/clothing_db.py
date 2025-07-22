import os
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv
from bson.objectid import ObjectId

# Cargar variables de entorno
load_dotenv()

# URI de conexión desde .env
MONGO_URI = os.getenv("MONGO_URI")

class ClothingStoreDB:
    def __init__(self):
        self.client = None
        self.db = None

    def connect(self):
        try:
            self.client = MongoClient(MONGO_URI)
            # Comprobar conexión
            self.client.admin.command('ping')
            self.db = self.client['clothing_store_db']
            print("\033[92m[+] Conexión exitosa a la base de datos clothing_store_db.\033[0m")
        except ConnectionFailure:
            print("\033[91m[-] Error: No se pudo conectar a la base de datos.\033[0m")
            exit()

    def disconnect(self):
        if self.client:
            self.client.close()
            print("\033[93m[!] Desconectado de la base de datos.\033[0m")

    # --- CRUD BÁSICO ---
    def insert_one(self, collection_name, document):
        print(f"\nInsertando un documento en '{collection_name}'...")
        col = self.db[collection_name]
        result = col.insert_one(document)
        print(f"Documento insertado con _id: {result.inserted_id}")

    def insert_many(self, collection_name, documents):
        print(f"\nInsertando varios documentos en '{collection_name}'...")
        col = self.db[collection_name]
        result = col.insert_many(documents)
        print(f"Documentos insertados con _id's: {result.inserted_ids}")

    def update_one(self, collection_name, filter_doc, update_doc):
        print(f"\nActualizando documento en '{collection_name}' con filtro: {filter_doc} ...")
        col = self.db[collection_name]
        result = col.update_one(filter_doc, {'$set': update_doc})
        print(f"Documentos modificados: {result.modified_count}")

    def delete_one(self, collection_name, filter_doc):
        print(f"\nEliminando documento en '{collection_name}' con filtro: {filter_doc} ...")
        col = self.db[collection_name]
        result = col.delete_one(filter_doc)
        print(f"Documentos eliminados: {result.deleted_count}")

    # --- CONSULTAS ESPECÍFICAS ---
    
    # i. Obtener la cantidad vendida de prendas por fecha y filtrarla con una fecha específica
    def get_sold_quantity_by_date(self, date_str):
        print("\n[Consulta] Cantidad vendida de prendas en fecha específica:", date_str)
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        pipeline = [
            {"$match": {"sale_date": date_obj}},
            {"$group": {"_id": "$sale_date", "total_sold": {"$sum": "$quantity"}}}
        ]
        result = list(self.db.sales.aggregate(pipeline))
        if result:
            print(f"Fecha: {result[0]['_id'].strftime('%Y-%m-%d')} - Total prendas vendidas: {result[0]['total_sold']}")
        else:
            print("No se encontraron ventas para esa fecha.")

    # ii. Obtener la lista de todas las marcas que tienen al menos una venta
    def get_brands_with_sales(self):
        print("\n[Consulta] Lista de marcas con al menos una venta")
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "localField": "product_id",
                    "foreignField": "_id",
                    "as": "product_info"
                }
            },
            {"$unwind": "$product_info"},
            {
                "$group": {
                    "_id": "$product_info.brand_id"
                }
            },
            {
                "$lookup": {
                    "from": "brands",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "brand_info"
                }
            },
            {"$unwind": "$brand_info"},
            {
                "$project": {
                    "_id": 0,
                    "brand_name": "$brand_info.name"
                }
            }
        ]
        results = list(self.db.sales.aggregate(pipeline))
        if results:
            for b in results:
                print(f"- {b['brand_name']}")
        else:
            print("No hay marcas con ventas registradas.")

    # iii. Obtener prendas vendidas y su cantidad restante en stock
    def get_sold_products_and_stock(self):
        print("\n[Consulta] Prendas vendidas y su cantidad restante en stock")
        pipeline = [
            {
                "$group": {
                    "_id": "$product_id",
                    "total_sold": {"$sum": "$quantity"}
                }
            },
            {
                "$lookup": {
                    "from": "products",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "product_info"
                }
            },
            {"$unwind": "$product_info"},
            {
                "$project": {
                    "product_name": "$product_info.name",
                    "total_sold": 1,
                    "stock": "$product_info.stock",
                    "remaining_stock": {"$subtract": ["$product_info.stock", "$total_sold"]}
                }
            }
        ]
        results = list(self.db.sales.aggregate(pipeline))
        for item in results:
            print(f"{item['product_name']}: Vendidas={item['total_sold']}, Stock restante={item['remaining_stock']}")

    # iv. Obtener listado de las 5 marcas más vendidas y su cantidad de ventas
    def get_top_5_brands_by_sales(self):
        print("\n[Consulta] Las 5 marcas más vendidas y su cantidad de ventas")
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "localField": "product_id",
                    "foreignField": "_id",
                    "as": "product_info"
                }
            },
            {"$unwind": "$product_info"},
            {
                "$group": {
                    "_id": "$product_info.brand_id",
                    "total_sales": {"$sum": "$quantity"}
                }
            },
            {
                "$lookup": {
                    "from": "brands",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "brand_info"
                }
            },
            {"$unwind": "$brand_info"},
            {
                "$project": {
                    "_id": 0,
                    "brand_name": "$brand_info.name",
                    "total_sales": 1
                }
            },
            {"$sort": {"total_sales": -1}},
            {"$limit": 5}
        ]
        results = list(self.db.sales.aggregate(pipeline))
        for r in results:
            print(f"{r['brand_name']}: {r['total_sales']} ventas")

# Datos iniciales para insertar (ejemplo con ids simulados para referencia)

def initial_data():
    from bson import ObjectId
    # Marcas
    brands = [
        {"_id": ObjectId(), "name": "Nike", "country": "USA"},
        {"_id": ObjectId(), "name": "Adidas", "country": "Germany"},
        {"_id": ObjectId(), "name": "Puma", "country": "Germany"},
        {"_id": ObjectId(), "name": "Under Armour", "country": "USA"},
        {"_id": ObjectId(), "name": "Reebok", "country": "USA"},
    ]

    # Productos
    products = [
        {"_id": ObjectId(), "name": "Air Max", "brand_id": brands[0]["_id"], "price": 120.0, "stock": 50},
        {"_id": ObjectId(), "name": "Ultraboost", "brand_id": brands[1]["_id"], "price": 150.0, "stock": 40},
        {"_id": ObjectId(), "name": "Suede Classic", "brand_id": brands[2]["_id"], "price": 80.0, "stock": 30},
        {"_id": ObjectId(), "name": "Charged Assert", "brand_id": brands[3]["_id"], "price": 90.0, "stock": 20},
        {"_id": ObjectId(), "name": "Nano 9", "brand_id": brands[4]["_id"], "price": 110.0, "stock": 25},
    ]

    # Usuarios
    users = [
        {"_id": ObjectId(), "username": "juan01", "email": "juan01@example.com", "password": "pass123", "role": "customer", "created_at": datetime(2025,7,1)},
        {"_id": ObjectId(), "username": "maria02", "email": "maria02@example.com", "password": "pass456", "role": "customer", "created_at": datetime(2025,7,2)},
        {"_id": ObjectId(), "username": "admin", "email": "admin@example.com", "password": "adminpass", "role": "admin", "created_at": datetime(2025,6,30)},
        {"_id": ObjectId(), "username": "pedro03", "email": "pedro03@example.com", "password": "pass789", "role": "customer", "created_at": datetime(2025,7,3)},
        {"_id": ObjectId(), "username": "laura04", "email": "laura04@example.com", "password": "passabc", "role": "customer", "created_at": datetime(2025,7,4)},
    ]

    # Reviews
    reviews = [
        {"_id": ObjectId(), "product_id": products[0]["_id"], "user_id": users[0]["_id"], "rating": 5, "comment": "Excelente calidad", "review_date": datetime(2025,7,5)},
        {"_id": ObjectId(), "product_id": products[1]["_id"], "user_id": users[1]["_id"], "rating": 4, "comment": "Muy cómodo", "review_date": datetime(2025,7,6)},
        {"_id": ObjectId(), "product_id": products[2]["_id"], "user_id": users[2]["_id"], "rating": 3, "comment": "Buen diseño", "review_date": datetime(2025,7,7)},
        {"_id": ObjectId(), "product_id": products[3]["_id"], "user_id": users[3]["_id"], "rating": 5, "comment": "Me encantó", "review_date": datetime(2025,7,8)},
        {"_id": ObjectId(), "product_id": products[4]["_id"], "user_id": users[4]["_id"], "rating": 4, "comment": "Buena durabilidad", "review_date": datetime(2025,7,9)},
    ]

    # Ventas
    sales = [
        {"_id": ObjectId(), "product_id": products[0]["_id"], "sale_date": datetime(2025,7,10), "quantity": 5, "total": 600.0, "user_id": users[0]["_id"]},
        {"_id": ObjectId(), "product_id": products[1]["_id"], "sale_date": datetime(2025,7,11), "quantity": 3, "total": 450.0, "user_id": users[1]["_id"]},
        {"_id": ObjectId(), "product_id": products[2]["_id"], "sale_date": datetime(2025,7,10), "quantity": 7, "total": 560.0, "user_id": users[2]["_id"]},
        {"_id": ObjectId(), "product_id": products[3]["_id"], "sale_date": datetime(2025,7,12), "quantity": 2, "total": 180.0, "user_id": users[3]["_id"]},
        {"_id": ObjectId(), "product_id": products[4]["_id"], "sale_date": datetime(2025,7,10), "quantity": 4, "total": 440.0, "user_id": users[4]["_id"]},
    ]

    return brands, products, reviews, sales, users


def main():
    store_db = ClothingStoreDB()
    store_db.connect()

    brands, products, reviews, sales, users = initial_data()

    # Insertar datos iniciales
    store_db.insert_many("brands", brands)
    store_db.insert_many("products", products)
    store_db.insert_many("users", users)
    store_db.insert_many("reviews", reviews)
    store_db.insert_many("sales", sales)

    # Ejemplos CRUD:
    # Insertar un nuevo usuario
    new_user = {"username": "ana05", "email": "ana05@example.com", "password": "ana123", "role": "customer", "created_at": datetime.now()}
    store_db.insert_one("users", new_user)

    # Actualizar email de un usuario
    store_db.update_one("users", {"username": "ana05"}, {"email": "ana05_updated@example.com"})

    # Eliminar un usuario
    store_db.delete_one("users", {"username": "ana05"})

    # Consultas:
    store_db.get_sold_quantity_by_date("2025-07-10")
    store_db.get_brands_with_sales()
    store_db.get_sold_products_and_stock()
    store_db.get_top_5_brands_by_sales()

    store_db.disconnect()


if __name__ == "__main__":
    main()