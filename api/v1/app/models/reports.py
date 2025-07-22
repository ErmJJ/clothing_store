from app.index import mongo

class reportsModel:
    @staticmethod
    def brands_with_sales():
        print(mongo.db.list_collection_names())
        pipeline = [
            {"$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "producto"
            }},
            {"$unwind": "$producto"},
            {"$group": {
                "_id": "$producto.brand_id"
            }},
            {"$lookup": {
                "from": "brands",
                "localField": "_id",
                "foreignField": "_id",
                "as": "marca"
            }},
            {"$unwind": "$marca"},
            {"$project": {
                "brand_id": {"$toString": "$_id"},
                "name": "$marca.name",
                "country": "$marca.country"
            }}
        ]
        return list(mongo.db.sales.aggregate(pipeline))

    @staticmethod
    def sold_products_stock():
        print(mongo.db.list_collection_names())
        pipeline = [
            {"$group": {
                "_id": "$product_id",
                "vendido": {"$sum": "$quantity"}
            }},
            {"$lookup": {
                "from": "products",
                "localField": "_id",
                "foreignField": "_id",
                "as": "producto"
            }},
            {"$unwind": "$producto"},
            {"$project": {
                "product_id": {"$toString": "$_id"},
                "name": "$producto.name",
                "vendido": 1,
                "stock_restante": "$producto.stock"
            }}
        ]
        return list(mongo.db.sales.aggregate(pipeline))

    @staticmethod
    def top_5_brands():
        print(mongo.db.list_collection_names())
        pipeline = [
            {"$lookup": {
                "from": "products",
                "localField": "product_id",
                "foreignField": "_id",
                "as": "producto"
            }},
            {"$unwind": "$producto"},
            {"$group": {
                "_id": "$producto.brand_id",
                "ventas_totales": {"$sum": "$quantity"}
            }},
            {"$sort": {"ventas_totales": -1}},
            {"$limit": 5},
            {"$lookup": {
                "from": "brands",
                "localField": "_id",
                "foreignField": "_id",
                "as": "marca"
            }},
            {"$unwind": "$marca"},
            {"$project": {
                "brand_id": {"$toString": "$_id"},
                "name": "$marca.name",
                "ventas_totales": 1
            }}
        ]
        return list(mongo.db.sales.aggregate(pipeline))

    @staticmethod
    def sales_by_date(date):
        print(mongo.db.list_collection_names())
        return list(mongo.db.sales.find({"sale_date": date}))