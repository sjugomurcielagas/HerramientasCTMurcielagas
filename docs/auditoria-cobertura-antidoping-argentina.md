# Cobertura de Antidoping en medicamentos argentinos

Revisión del 5 de noviembre de 2026 sobre la versión local. Se midió si el módulo devuelve una ficha revisada a partir de un principio activo o de la marca que aparece en el ranking. Una coincidencia del índice externo pendiente de verificar no cuenta como ficha revisada.

No se encontró un ranking nacional público completo de 100 medicamentos por unidades. Se analizaron dos fuentes por separado:

| Fuente y período | Universo analizado | Cobertura local por fórmula o activo | Cobertura por marca |
| --- | ---: | ---: | ---: |
| Mercado total nacional, 12 meses a junio de 2024 | 9 entradas farmacológicas en las 10 posiciones publicadas. La otra entrada es «Producto Cosmético». | 2/9 | La tabla no identifica marcas. |
| Dispensas PAMI, abril a junio de 2026 | 49 presentaciones farmacológicas de 50 filas publicadas. Se excluyeron las tiras reactivas. | 2/31 grupos por fórmula declarada | 0/49 con el nombre comercial publicado. |

Fuentes: [informe de mercado publicado por SAMF](https://samf.com.ar/wp-content/uploads/2024/07/Mercado-Argentino-Jun.2024.pdf) y [planilla de PAMI, abril a junio de 2026](https://datos.pami.org.ar/dataset/71fc4db2-11f8-4f28-a836-eb799174ae61/resource/b8c1922c-8a8a-488a-b439-0b96151539cb/download/listado-cincuenta-medicamentos-mas-dispensados-abril-junio-2026.xlsx).

## Dispensas PAMI sin repetir fórmulas

Se agrupó por composición declarada, sin distinguir marca, concentración o cantidad del envase. Se mantuvieron separadas las combinaciones. Al descomponer los grupos en activos, se identificaron 29 nombres distintos y se dejaron tres descripciones parciales o genéricas sin resolver. Esta agrupación mide cobertura, no equivalencia entre presentaciones.

| Resultado del buscador | Fórmulas y activos |
| --- | --- |
| Ficha por activo | Paracetamol, ibuprofeno. |
| Pendiente, con restricción o condición que conviene revisar primero | Bisoprolol, hidroclorotiazida, insulina humana, dorzolamida + timolol, losartán + hidroclorotiazida, insulina aspártica, enalapril + hidroclorotiazida, furosemida. |
| Pendiente, otras fórmulas identificadas por PAMI | Levotiroxina, ácido acetilsalicílico, losartán, enalapril, metformina, alprazolam, valsartán, rosuvastatina, clonazepam, latanoprost, zolpidem, amlodipina, atorvastatina, tamsulosina, amoxicilina + ácido clavulánico, amiodarona, dexlansoprazol, propinox + clonixinato de lisina. |
| Pendiente, composición parcial o genérica | Hidroxipropilmetilcelulosa + asociados, insaponificables, aminoácidos + vitamina B12. |

Paracetamol e ibuprofeno corresponden a tres filas y 769.056 unidades del ranking publicado. La ficha de la sustancia no verifica por sí sola esas tres presentaciones.

El resultado pendiente importa especialmente para insulinas y diuréticos. La AMA incluye a las insulinas en S4 y a hidroclorotiazida y furosemida en S5. Los betabloqueantes, como bisoprolol y timolol, tienen restricciones por deporte en P1. La dorzolamida requiere considerar la excepción de S5 por vía oftálmica tópica. [Lista de Prohibiciones 2026](https://www.wada-ama.org/sites/default/files/2025-09/2026list_en_final_clean_september_2025.pdf)

En pruebas separadas con la API pública de Argly aparecieron candidatos para Glaucotensil TD, Losacor D, Insulatard FlexPen y PH Lágrimas. Para PH Lágrimas, PAMI indica «+ asociados» y la API devuelve el nombre de un solo activo. Hace falta verificar el prospecto antes de evaluar la fórmula. [Documentación de Argly](https://argly.com.ar/#docs)

## Caso de regresión Anaflex

En la versión anterior, una búsqueda por marca se expandía a paracetamol y diclofenac como alias y esas búsquedas se presentaban como versiones del producto. El código también podía aceptar una ausencia de coincidencias como resultado favorable y mostrar «No habilitar uso» cuando no identificaba un activo.

En la versión local, Anaflex muestra presentaciones identificadas de Bagó y pide elegir la del envase. Los comprimidos de paracetamol 500 mg, las cápsulas de diclofenac sódico 25 mg y las cápsulas Plus con diclofenac sódico 25 mg y paracetamol 300 mg se verifican por separado. La prueba de regresión comprueba que la marca devuelve presentaciones y que la fórmula seleccionada conserva sus ingredientes y su fuente. [Bagó, Anaflex comprimidos](https://www.bago.com.ar/vademecum/anaflex-comprimidos) · [ANMAT, Anaflex cápsulas](https://boletin.anmat.gob.ar/julio_2023/Dispo_5221-23.pdf) · [Bagó, Anaflex Plus](https://consumomasivo.bago.com.ar/wp-content/uploads/2025/12/Prospecto-ANAFLEX-PLUS-disp.-3073-25-Y-ANAFLEX-Disp.-4816-25.pdf)
