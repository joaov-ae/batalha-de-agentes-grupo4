"""Dependências das rotas."""

from typing import Annotated

from fastapi import Depends, Request

from app.motor import Motor


def motor(request: Request) -> Motor:
    return request.app.state.motor


MotorDep = Annotated[Motor, Depends(motor)]
