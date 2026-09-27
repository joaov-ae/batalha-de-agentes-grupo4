-- Tabela de referência das micro-categorias.
-- consumo: categoria que NÃO move saldo_apos na base (vai para a fatura). Medido: 0,0% das linhas
--          dessas categorias alteram o saldo, e as demais alteram em ~99%.
-- discricionario: consumo elegível ao ajuste "gasto acima da própria média".
-- reagendavel: saída da conta que o cliente pode mover para depois do salário.
-- fora_da_rotina: entradas/saídas que não entram na recorrência nem no ritmo (13º, PLR, juros).
CREATE OR REPLACE TABLE `$dm.ref_categorias` AS
SELECT * FROM UNNEST([
  STRUCT('Mercado' AS micro, TRUE AS consumo, FALSE AS discricionario, FALSE AS reagendavel, FALSE AS fora_da_rotina),
  ('Posto de combustivel', TRUE, FALSE, FALSE, FALSE),
  ('Pedagio', TRUE, FALSE, FALSE, FALSE),
  ('Estacionamento', TRUE, FALSE, FALSE, FALSE),
  ('Passagem de onibus', TRUE, FALSE, FALSE, FALSE),
  ('Manutencao da casa', TRUE, FALSE, FALSE, FALSE),
  ('Aluguel de carro', TRUE, FALSE, FALSE, FALSE),
  ('Delivery', TRUE, TRUE, FALSE, FALSE),
  ('Restaurantes', TRUE, TRUE, FALSE, FALSE),
  ('Padaria', TRUE, TRUE, FALSE, FALSE),
  ('Cafeteria', TRUE, TRUE, FALSE, FALSE),
  ('Outras comidas e bebidas', TRUE, TRUE, FALSE, FALSE),
  ('Loja de conveniencia', TRUE, TRUE, FALSE, FALSE),
  ('Transporte por app', TRUE, TRUE, FALSE, FALSE),
  ('Compras', TRUE, TRUE, FALSE, FALSE),
  ('Vestuario e acessorios', TRUE, TRUE, FALSE, FALSE),
  ('Brinquedos e artigos infantis', TRUE, TRUE, FALSE, FALSE),
  ('Artigos esportivos', TRUE, TRUE, FALSE, FALSE),
  ('Moveis e decoracao', TRUE, TRUE, FALSE, FALSE),
  ('Eletronicos', TRUE, TRUE, FALSE, FALSE),
  ('Cinema', TRUE, TRUE, FALSE, FALSE),
  ('Outros entretenimentos', TRUE, TRUE, FALSE, FALSE),
  ('Livros musica e video', TRUE, TRUE, FALSE, FALSE),
  ('Videogames', TRUE, TRUE, FALSE, FALSE),
  ('Ingresso de shows', TRUE, TRUE, FALSE, FALSE),
  ('Eventos e festas', TRUE, TRUE, FALSE, FALSE),
  ('Museu e teatro', TRUE, TRUE, FALSE, FALSE),
  ('Hospedagem', TRUE, TRUE, FALSE, FALSE),
  ('Passagem aerea e taxas', TRUE, TRUE, FALSE, FALSE),
  ('Outros gastos de viagem', TRUE, TRUE, FALSE, FALSE),
  ('Compra de moedas', TRUE, TRUE, FALSE, FALSE),
  ('Produtos de beleza', TRUE, TRUE, FALSE, FALSE),
  ('Outros cuidados pessoais', TRUE, TRUE, FALSE, FALSE),
  ('Outras transferencias', FALSE, FALSE, TRUE, FALSE),
  ('Boleto', FALSE, FALSE, TRUE, FALSE),
  ('Titulo de capitalizacao', FALSE, FALSE, TRUE, FALSE),
  ('Consorcio', FALSE, FALSE, TRUE, FALSE),
  ('13o salario', FALSE, FALSE, FALSE, TRUE),
  ('Bonus PLR', FALSE, FALSE, FALSE, TRUE),
  ('Juros pagos', FALSE, FALSE, FALSE, TRUE)
]);
