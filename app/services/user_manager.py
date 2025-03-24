import json
import os
from datetime import datetime
from app.models import db, User
from werkzeug.security import generate_password_hash, check_password_hash
from app.services.logger import setup_logging

logger = setup_logging()

class UserManager:
    """Service for managing users"""
    

    def _create_default_admin(self):
        """Create a default admin user in the database"""
        try:
            # Check if admin user already exists
            admin = User.query.filter_by(username="admin").first()
            if not admin:
                admin = User(
                    username="admin",
                    password=generate_password_hash("admin123"),  # This should be changed in production
                    role="admin"
                )
                db.session.add(admin)
                db.session.commit()
                logger.info("Created default admin user")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating default admin: {e}", exc_info=True)
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return User.query.get(user_id)
    
    def get_user_by_username(self, username):
        """Get user by username"""
        return User.query.filter_by(username=username).first()
    
    def create_user(self, username, email=None, password=None, role="user"):
        """Create a new user"""
        try:
            if self.get_user_by_username(username):
                raise ValueError(f"Username '{username}' already exists")
            
            hashed_password = generate_password_hash(password)
            user = User(
                username=username,
                password=hashed_password,
                role=role
            )
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Created user: {username}")
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {e}", exc_info=True)
            raise
    
    def update_user(self, user_id, data):
        """Update user information"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                raise ValueError(f"User with ID '{user_id}' not found")
            
            # Update basic fields
            if 'username' in data:
                existing = self.get_user_by_username(data['username'])
                if existing and existing.id != user_id:
                    raise ValueError(f"Username '{data['username']}' already exists")
                user.username = data['username']
                
            if 'password' in data:
                user.password = generate_password_hash(data['password'])
                
            if 'role' in data:
                user.role = data['role']
            
            db.session.commit()
            logger.info(f"Updated user: {user.username}")
            return user
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user: {e}", exc_info=True)
            raise
    
    def delete_user(self, user_id):
        """Delete a user"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                raise ValueError(f"User with ID '{user_id}' not found")
            
            username = user.username
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f"Deleted user: {username}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting user: {e}", exc_info=True)
            raise
    
    def authenticate_user(self, username, password):
        """Authenticate a user by username and password"""
        user = self.get_user_by_username(username)
        if not user:
            return None
        
        if check_password_hash(user.password, password):
            return user
        
        return None
    
    def get_all_users(self):
        """Get all users"""
        return User.query.all() 