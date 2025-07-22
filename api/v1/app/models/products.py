from bson.objectid import ObjectId
from app.index import mongo

class productsModel:
    @staticmethod
    def get_all():
        print(mongo.db.list_collection_names())
        products_cursor = mongo.db.products.find()
        products = []
        for product in products_cursor:
            product['_id'] = str(product['_id'])
            products.append(product)
        return products

    @staticmethod
    def get_by_id(product_id):
        try:
            product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
            if product:
                product['_id'] = str(product['_id'])
                return product
        except:
            return None

    @staticmethod
    def create(data):
        try:
            result = mongo.db.products.insert_one(data)
            return str(result.inserted_id)
        except:
            return None

    @staticmethod
    def update(product_id, data):
        try:
            result = mongo.db.products.update_one(
                {"_id": ObjectId(product_id)},
                {"$set": data}
            )
            return result.modified_count
        except:
            return -1

    @staticmethod
    def delete(product_id):
        try:
            result = mongo.db.products.delete_one({"_id": ObjectId(product_id)})
            return result.deleted_count
        except:
            return -1