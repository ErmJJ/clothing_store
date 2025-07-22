import os
from flask import Flask
from flask_cors import CORS
from flask_pymongo import PyMongo
from dotenv import load_dotenv

# Carga las variables del .env
load_dotenv()

mongo = PyMongo()

def create_app():
    app = Flask(__name__)
    
    # Usa la variable del entorno en lugar de hardcodear la URI
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")

    mongo.init_app(app)
    
    CORS(app, origins="*")

    from .controllers.brands import brands_endpoint
    app.register_blueprint(brands_endpoint, url_prefix="/clothing/api/v1")
    
    from .controllers.products import products_endpoint
    app.register_blueprint(products_endpoint, url_prefix="/clothing/api/v1")
    
    from .controllers.reviews import reviews_endpoint
    app.register_blueprint(reviews_endpoint, url_prefix="/clothing/api/v1")
    
    from .controllers.sales import sales_endpoint
    app.register_blueprint(sales_endpoint, url_prefix="/clothing/api/v1")
    
    from .controllers.users import users_endpoint
    app.register_blueprint(users_endpoint, url_prefix="/clothing/api/v1")

    from .controllers.reports import reports_endpoint
    app.register_blueprint(reports_endpoint, url_prefix="/clothing/api/v1")

    return app