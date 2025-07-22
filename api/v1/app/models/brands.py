from bson.objectid import ObjectId
from app.index import mongo

class brandsModel:
    @staticmethod
    def get_all():
        print(mongo.db.list_collection_names())
        cursor = mongo.db.brands.find()
        brands = []
        for brand in cursor:
            brand['_id'] = str(brand['_id'])
            brands.append(brand)
        return brands

    @staticmethod
    def get_by_id(brand_id):
        try:
            brand = mongo.db.brands.find_one({"_id": ObjectId(brand_id)})
            if brand:
                brand['_id'] = str(brand['_id'])
                return brand
        except:
            return None

    @staticmethod
    def create(data):
        try:
            result = mongo.db.brands.insert_one(data)
            return str(result.inserted_id)
        except:
            return None

    @staticmethod
    def update(brand_id, data):
        try:
            result = mongo.db.brands.update_one(
                {"_id": ObjectId(brand_id)},
                {"$set": data}
            )
            return result.modified_count
        except:
            return -1

    @staticmethod
    def delete(brand_id):
        try:
            result = mongo.db.brands.delete_one({"_id": ObjectId(brand_id)})
            return result.deleted_count
        except:
            return -1