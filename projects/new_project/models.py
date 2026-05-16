from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Users(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    def to_dict(self):
        return {"id": self.id, "username": self.username, "email": self.email, "password": self.password}

class Tasks(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", name="fk_tasks_user_id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(255), nullable=False, default="pending")
    priority = db.Column(db.String(255), nullable=False, default="medium")
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "user_id": self.user_id, "title": self.title, "description": self.description, "status": self.status, "priority": self.priority, "due_date": self.due_date.isoformat() if self.due_date else None, "completed_at": self.completed_at.isoformat() if self.completed_at else None, "created_at": self.created_at.isoformat() if self.created_at else None, "updated_at": self.updated_at.isoformat() if self.updated_at else None}
