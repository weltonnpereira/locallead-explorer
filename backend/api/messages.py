from fastapi import APIRouter
from schemas.message import MessageRequest
from services.messaging import generate_pitch_message
# para comitar
router = APIRouter(
    prefix="/api/v1/messages",
    tags=["Messages"]
)

@router.post("/generate")
async def message_to_send(payload: MessageRequest):
    result = generate_pitch_message(payload)
    
    return {
        "status": "success",
        "data": {
            "channel": payload.channel,
            "target_type": payload.target_type,
            "subject": result["subject"],
            "message": result["message"]
        }
    }