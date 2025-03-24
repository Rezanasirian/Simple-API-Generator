from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')
    
    @property
    def is_admin(self):
        return self.role == 'admin'

# API Key model for storing user API keys
class ApiKey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    key = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref=db.backref('api_keys', lazy=True))

# API Call Log - records individual API calls
class APICall(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    api_id = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status_code = db.Column(db.Integer, nullable=False)
    response_time = db.Column(db.Float, nullable=False)  # in seconds
    endpoint = db.Column(db.String(255), nullable=False)
    method = db.Column(db.String(10), nullable=False)
    is_success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text, nullable=True)
    
    user = db.relationship('User', backref=db.backref('api_calls', lazy=True))

# API Daily Metrics - aggregated data for dashboard
class APIDailyMetric(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    api_id = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_calls = db.Column(db.Integer, default=0)
    successful_calls = db.Column(db.Integer, default=0)
    failed_calls = db.Column(db.Integer, default=0)
    avg_response_time = db.Column(db.Float, default=0.0)
    
    __table_args__ = (db.UniqueConstraint('api_id', 'date', name='unique_api_date'),)
