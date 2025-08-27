from bson.objectid import ObjectId
from app.index import mongo

class reportsModel:

    # 1. Listado de todas las marcas que tienen al menos una venta
    @staticmethod
    def brands_with_sales():
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "localField": "_id",
                    "foreignField": "brand_id",
                    "as": "products"
                }
            },
            { "$unwind": "$products" },
            {
                "$lookup": {
                    "from": "sales",
                    "localField": "products._id",
                    "foreignField": "product_id",
                    "as": "sales"
                }
            },
            { "$match": { "sales": { "$ne": [] } } },
            {
                "$project": {
                    "_id": { "$toString": "$_id" },
                    "name": 1,
                    "country": 1
                }
            },
            { "$group": { "_id": "$_id", "name": { "$first": "$name" }, "country": { "$first": "$country" } } }
        ]
        return list(mongo.db.brands.aggregate(pipeline))

    # 2. Prendas vendidas y su cantidad restante en stock
    @staticmethod
    def products_sold_and_stock():
        pipeline = [
            {
                "$lookup": {
                    "from": "sales",
                    "localField": "_id",
                    "foreignField": "product_id",
                    "as": "sales"
                }
            },
            {
                "$project": {
                    "_id": { "$toString": "$_id" },
                    "name": 1,
                    "stock": 1,
                    "sold_quantity": { "$sum": "$sales.quantity" }
                }
            }
        ]
        return list(mongo.db.products.aggregate(pipeline))

    # 3. Top 5 marcas más vendidas
    @staticmethod
    def top_5_brands():
        pipeline = [
            {
                "$lookup": {
                    "from": "products",
                    "localField": "_id",
                    "foreignField": "brand_id",
                    "as": "products"
                }
            },
            { "$unwind": "$products" },
            {
                "$lookup": {
                    "from": "sales",
                    "localField": "products._id",
                    "foreignField": "product_id",
                    "as": "sales"
                }
            },
            { "$unwind": "$sales" },
            {
                "$group": {
                    "_id": { "$toString": "$_id" },
                    "brand_name": { "$first": "$name" },
                    "total_sales": { "$sum": "$sales.quantity" }
                }
            },
            { "$sort": { "total_sales": -1 } },
            { "$limit": 5 }
        ]
        return list(mongo.db.brands.aggregate(pipeline))

    # 4. Usuarios con más compras realizadas
    @staticmethod
    def top_users():
        pipeline = [
            {
                "$lookup": {
                    "from": "sales",
                    "localField": "_id",
                    "foreignField": "user_id",
                    "as": "sales"
                }
            },
            {
                "$project": {
                    "_id": { "$toString": "$_id" },
                    "username": 1,
                    "email": 1,
                    "total_purchases": { "$size": "$sales" }
                }
            },
            { "$sort": { "total_purchases": -1 } },
            { "$limit": 5 }
        ]
        return list(mongo.db.users.aggregate(pipeline))

    # 5. Promedio de calificación por producto
    @staticmethod
    def average_ratings():
        pipeline = [
            {
                "$lookup": {
                    "from": "reviews",
                    "localField": "_id",
                    "foreignField": "product_id",
                    "as": "reviews"
                }
            },
            {
                "$project": {
                    "_id": { "$toString": "$_id" },
                    "name": 1,
                    "avg_rating": { "$avg": "$reviews.rating" },
                    "total_reviews": { "$size": "$reviews" }
                }
            },
            { "$sort": { "avg_rating": -1 } }
        ]
        return list(mongo.db.products.aggregate(pipeline))