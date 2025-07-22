from flask import Blueprint, jsonify, request
from ..models.sales import salesModel

sales_endpoint = Blueprint('sales_endpoint', __name__)

@sales_endpoint.route('/sales', methods=['GET'])
def get_sales():
    saleId = request.args.get('id')

    if saleId:
        sale = salesModel.get_by_id(saleId)
        if sale:
            return jsonify(sale), 200
        return jsonify({"error": "Venta no encontrada"}), 404

    sales = salesModel.get_all()
    return jsonify(sales), 200

@sales_endpoint.route('/sales', methods=['POST'])
def create_sale():
    data = request.json
    sale_id = salesModel.create(data)
    if sale_id:
        return jsonify({"inserted_id": sale_id}), 201
    return jsonify({"error": "No se pudo registrar la venta"}), 400

@sales_endpoint.route('/sales', methods=['PUT'])
def update_sale():
    saleId = request.args.get('id')
    data = request.json
    updated = salesModel.update(saleId, data)
    if updated == 1:
        return jsonify({"message": "Venta actualizada"}), 200
    return jsonify({"error": "No se pudo actualizar la venta"}), 400

@sales_endpoint.route('/sales', methods=['DELETE'])
def delete_sale():
    saleId = request.args.get('id')
    deleted = salesModel.delete(saleId)
    if deleted == 1:
        return jsonify({"message": "Venta eliminada"}), 200
    return jsonify({"error": "No se pudo eliminar la venta"}), 400