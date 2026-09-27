import os

# Testes nunca chamam Vertex/Model Armor de verdade: a camada semântica entra por mocks.
os.environ["SEMANTICO_HABILITADO"] = "false"
