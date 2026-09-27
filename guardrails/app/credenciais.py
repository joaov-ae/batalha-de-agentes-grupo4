"""Credenciais Google: no Cloud Run vale o SA do serviço (ADC).

Em dev, aceita GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token), como o data_manager.
"""

import os

import google.oauth2.credentials


def credenciais():
    if token := os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN"):
        return google.oauth2.credentials.Credentials(token)
    return None
