from bson.objectid import ObjectId
from app.index import mongo

class salesModel:
    @staticmethod
    def get_all():
        print(mongo.db.list_collection_names())
        cursor = mongo.db.sales.find()
        sales = []
        for sale in cursor:
            sale['_id'] = str(sale['_id'])
            sales.append(sale)
        return sales

    @staticmethod
    def get_by_id(sale_id):
        try:
            sale = mongo.db.sales.find_one({"_id": ObjectId(sale_id)})
            if sale:
                sale['_id'] = str(sale['_id'])
                return sale
        except:
            return None

    @staticmethod
    def create(data):
        try:
            result = mongo.db.sales.insert_one(data)
            return str(result.inserted_id)
        except:
            return None

    @staticmethod
    def update(sale_id, data):
        try:
            result = mongo.db.sales.update_one(
                {"_id": ObjectId(sale_id)},
                {"$set": data}
            )
            return result.modified_count
        except:
            return -1

    @staticmethod
    def delete(sale_id):
        try:
            result = mongo.db.sales.delete_one({"_id": ObjectId(sale_id)})
            return result.deleted_count
        except:
            return -1