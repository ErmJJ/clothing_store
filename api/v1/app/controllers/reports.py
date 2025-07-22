from flask import Blueprint, jsonify, request
from ..models.reports import reportsModel

reports_endpoint = Blueprint('reports_endpoint', __name__)

@reports_endpoint.route('/reports/brands-with-sales', methods=['GET'])
def get_brands_with_sales():
    data = reportsModel.brands_with_sales()
    return jsonify(data), 200

@reports_endpoint.route('/reports/sold-products-stock', methods=['GET'])
def get_sold_products_stock():
    data = reportsModel.sold_products_stock()
    return jsonify(data), 200

@reports_endpoint.route('/reports/top-5-brands', methods=['GET'])
def get_top_5_brands():
    data = reportsModel.top_5_brands()
    return jsonify(data), 200

@reports_endpoint.route('/reports/sales-by-date', methods=['GET'])
def get_sales_by_date():
    date = request.args.get('date')
    if not date:
        return jsonify({"error": "Parámetro 'date' requerido"}), 400
    data = reportsModel.sales_by_date(date)
    return jsonify(data), 200