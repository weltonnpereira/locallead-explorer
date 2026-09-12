from fastapi import APIRouter, Depends
from schemas.message import MessageRequest
from services.messaging import generate_pitch_message
from services.rate_limit import message_rate_limit
# para comitar
router = APIRouter(
    prefix="/api/v1/messages",
    tags=["Messages"]
)

@router.post("/generate", dependencies=[Depends(message_rate_limit)])
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