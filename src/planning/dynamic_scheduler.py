def reschedule_route(current_route: dict, live_context: dict) -> dict:
    updated_route = dict(current_route)
    updated_route["reschedule_note"] = (
        "动态调度接口占位。接入天气、人流、演出时间和定位后再启用真实重排。"
    )
    updated_route["data_status"] = "simulated"
    return updated_route

