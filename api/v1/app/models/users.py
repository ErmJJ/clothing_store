from bson.objectid import ObjectId
from app.index import mongo

class usersModel:
    @staticmethod
    def get_all():
        print(mongo.db.list_collection_names())
        cursor = mongo.db.users.find()
        users = []
        for user in cursor:
            user['_id'] = str(user['_id'])
            users.append(user)
        return users

    @staticmethod
    def get_by_id(user_id):
        try:
            user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user['_id'] = str(user['_id'])
                return user
        except:
            return None

    @staticmethod
    def create(data):
        try:
            result = mongo.db.users.insert_one(data)
            return str(result.inserted_id)
        except:
            return None

    @staticmethod
    def update(user_id, data):
        try:
            result = mongo.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": data}
            )
            return result.modified_count
        except:
            return -1

    @staticmethod
    def delete(user_id):
        try:
            result = mongo.db.users.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count
        except:
            return -1