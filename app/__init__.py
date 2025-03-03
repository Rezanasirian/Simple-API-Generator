from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from app.models import db, User
from SimpleApiGenerator.app.api.routes.addApi import API_addApi_np
# from app.api.routes.API_Edit import API_Edit_np
from app.api.routes.API_Generator import create_api_blueprint
from SimpleApiGenerator.app.api.routes.apiPage import API_ApiList
from SimpleApiGenerator.app.api.routes.API_conditoin import API_Condition_np
from SimpleApiGenerator.app.api.routes.API_config import api_config_bp
from SimpleApiGenerator.app.api.routes.API_test_api import API_test_api_np
from SimpleApiGenerator.app.api.routes.testRout import testRout
from services.APIQueryBuilder import APIQueryBuilder
from auth import auth as auth_blueprint
from admin import admin as admin_blueprint
from app.main import main as main_blueprint

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'your_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'

    # db.init_app(app)
    # login_manager = LoginManager()
    # login_manager.login_view = 'auth.login'
    # login_manager.init_app(app)

    # @login_manager.user_loader
    # def load_user(user_id):
    #     return User.query.get(int(user_id))

    api = APIQueryBuilder('config/ApiDoc.json')
    api_configurations = api._load_json()
    #
    app.register_blueprint(API_ApiList,url_prefix='/api')
    app.register_blueprint(API_addApi_np, url_prefix='/api')
    # app.register_blueprint(API_Edit_np, url_prefix='/api')
    app.register_blueprint(API_Condition_np, url_prefix='/api')
    app.register_blueprint(api_config_bp, url_prefix='/api')
    app.register_blueprint(API_test_api_np, url_prefix='/api')
    app.register_blueprint(testRout, url_prefix='/api')
    # app.register_blueprint(auth_blueprint)
    # app.register_blueprint(admin_blueprint)
    # app.register_blueprint(main_blueprint)

    for api_name, config in api_configurations.items():
        bp = create_api_blueprint(api_name, config)
        app.register_blueprint(bp, url_prefix='/api')

    return app
