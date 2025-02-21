from flask import Blueprint, render_template
from flask_login import login_required, current_user

main = Blueprint('main', __name__)

@main.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=current_user.username)

@main.route('/')
@login_required  # Ensure user is logged in to access the index page
def index():
    return render_template('index.html')
