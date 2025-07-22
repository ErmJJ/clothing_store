from flask import Blueprint, jsonify, request
from ..models.brands import brandsModel

brands_endpoint = Blueprint('brands_endpoint', __name__)

@brands_endpoint.route('/brands', methods=['GET'])
def get_brands():
    brandId = request.args.get('id')

    if brandId:
        brand = brandsModel.get_by_id(brandId)
        if brand:
            return jsonify(brand), 200
        return jsonify({"error": "Marca no encontrada"}), 404

    brands = brandsModel.get_all()
    return jsonify(brands), 200

@brands_endpoint.route('/brands', methods=['POST'])
def create_brand():
    data = request.json
    brand_id = brandsModel.create(data)
    if brand_id:
        return jsonify({"inserted_id": brand_id}), 201
    return jsonify({"error": "No se pudo crear la marca"}), 400

@brands_endpoint.route('/brands', methods=['PUT'])
def update_brand():
    brandId = request.args.get('id')
    data = request.json
    updated = brandsModel.update(brandId, data)
    if updated == 1:
        return jsonify({"message": "Marca actualizada"}), 200
    return jsonify({"error": "No se pudo actualizar la marca"}), 400

@brands_endpoint.route('/brands', methods=['DELETE'])
def delete_brand():
    brandId = request.args.get('id')
    deleted = brandsModel.delete(brandId)
    if deleted == 1:
        return jsonify({"message": "Marca eliminada"}), 200
    return jsonify({"error": "No se pudo eliminar la marca"}), 400