from bson.objectid import ObjectId
from app.index import mongo

class reviewsModel:
    @staticmethod
    def get_all():
        print(mongo.db.list_collection_names())
        cursor = mongo.db.reviews.find()
        reviews = []
        for review in cursor:
            review['_id'] = str(review['_id'])
            reviews.append(review)
        return reviews

    @staticmethod
    def get_by_id(review_id):
        try:
            review = mongo.db.reviews.find_one({"_id": ObjectId(review_id)})
            if review:
                review['_id'] = str(review['_id'])
                return review
        except:
            return None

    @staticmethod
    def create(data):
        try:
            result = mongo.db.reviews.insert_one(data)
            return str(result.inserted_id)
        except:
            return None

    @staticmethod
    def update(review_id, data):
        try:
            result = mongo.db.reviews.update_one(
                {"_id": ObjectId(review_id)},
                {"$set": data}
            )
            return result.modified_count
        except:
            return -1

    @staticmethod
    def delete(review_id):
        try:
            result = mongo.db.reviews.delete_one({"_id": ObjectId(review_id)})
            return result.deleted_count
        except:
            return -1