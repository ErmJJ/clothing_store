from flask import Blueprint, jsonify, request
from ..models.reviews import reviewsModel

reviews_endpoint = Blueprint('reviews_endpoint', __name__)

@reviews_endpoint.route('/reviews', methods=['GET'])
def get_reviews():
    reviewId = request.args.get('id')

    if reviewId:
        review = reviewsModel.get_by_id(reviewId)
        if review:
            return jsonify(review), 200
        return jsonify({"error": "Reseña no encontrada"}), 404

    reviews = reviewsModel.get_all()
    return jsonify(reviews), 200

@reviews_endpoint.route('/reviews', methods=['POST'])
def create_review():
    data = request.json
    review_id = reviewsModel.create(data)
    if review_id:
        return jsonify({"inserted_id": review_id}), 201
    return jsonify({"error": "No se pudo crear la reseña"}), 400

@reviews_endpoint.route('/reviews', methods=['PUT'])
def update_review():
    reviewId = request.args.get('id')
    data = request.json
    updated = reviewsModel.update(reviewId, data)
    if updated == 1:
        return jsonify({"message": "Reseña actualizada"}), 200
    return jsonify({"error": "No se pudo actualizar la reseña"}), 400

@reviews_endpoint.route('/reviews', methods=['DELETE'])
def delete_review():
    reviewId = request.args.get('id')
    deleted = reviewsModel.delete(reviewId)
    if deleted == 1:
        return jsonify({"message": "Reseña eliminada"}), 200
    return jsonify({"error": "No se pudo eliminar la reseña"}), 400