from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db.session import get_db
from ..models.task import Task as TaskModel
from ..schemas.task import Task, TaskCreate, TaskUpdate

router = APIRouter()

@router.get("/{deal_id}", response_model=List[Task])
def read_tasks(deal_id: int, db: Session = Depends(get_db)):
    tasks = db.query(TaskModel).filter(TaskModel.deal_id == deal_id).all()
    return tasks

@router.get("/", response_model=List[Task])
def get_tasks(db: Session = Depends(get_db)):
    """Fetch all tasks for the Calendar/Tasks view"""
    tasks = db.query(TaskModel).all()
    return tasks

@router.post("/", response_model=Task)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = TaskModel(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.patch("/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    db.delete(db_task)
    db.commit()
    return {"status": "success"}
