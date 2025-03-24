from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import uuid


class User(UserMixin):
    """User class for authentication and user management"""
    
    def __init__(self, id=None, username=None, email=None, password=None, role="user", 
                 created_at=None, last_login=None, is_active=True):
        self.id = id or str(uuid.uuid4())
        self.username = username
        self.email = email
        self.password_hash = generate_password_hash(password) if password else None
        self.role = role  # 'admin', 'user', etc.
        self.created_at = created_at or datetime.now()
        self.last_login = last_login
        self.is_active = is_active
    
    def check_password(self, password):
        """Check if provided password matches stored hash"""
        return check_password_hash(self.password_hash, password)
    
    def set_password(self, password):
        """Set a new password"""
        self.password_hash = generate_password_hash(password)
    
    def to_dict(self):
        """Convert user to dictionary for storage"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,
            'role': self.role,
            'created_at': self.created_at,
            'last_login': self.last_login,
            'is_active': self.is_active
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create a user from dictionary data"""
        if not data:
            return None
            
        user = cls()
        user.id = data.get('id')
        user.username = data.get('username')
        user.email = data.get('email')
        user.password_hash = data.get('password_hash')
        user.role = data.get('role', 'user')
        
        # Handle datetime conversions
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            user.created_at = datetime.fromisoformat(created_at)
        else:
            user.created_at = created_at
            
        last_login = data.get('last_login')
        if isinstance(last_login, str) and last_login:
            user.last_login = datetime.fromisoformat(last_login)
        else:
            user.last_login = last_login
            
        user.is_active = data.get('is_active', True)
        
        return user 