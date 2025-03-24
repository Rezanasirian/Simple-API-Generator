"""
Script to create an admin user directly using UserManager.
Run this from the command line: python create_admin.py
"""
import sys
from app import create_app
from app.services.user_manager import UserManager

def create_admin_user(username, password):
    """Create an admin user with the given username and password."""
    try:
        # Create Flask app context
        app = create_app()
        with app.app_context():
            user_manager = UserManager()
            user = user_manager.create_user(
                username=username,
                password=password,
                role='admin'
            )
            print(f"Admin user '{username}' created successfully!")
            return True
    except Exception as e:
        print(f"Error creating admin user: {str(e)}")
        return False

if __name__ == "__main__":
    print("Creating admin user...")
    
    if len(sys.argv) == 3:
        username = sys.argv[1]
        password = sys.argv[2]
    else:
        username = input("Enter admin username: ")
        password = input("Enter admin password (minimum 6 characters): ")
    
    if len(password) < 6:
        print("Error: Password must be at least 6 characters long")
        sys.exit(1)
        
    success = create_admin_user(username, password)
    
    if success:
        print("\nAdmin user created successfully! You can now log in with these credentials.")
    else:
        print("\nFailed to create admin user. See error above.")
        sys.exit(1) 