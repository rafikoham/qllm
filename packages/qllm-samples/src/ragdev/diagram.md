```mermaid
graph TB
    subgraph "Interface Client"
        A[Client] --> |1. Envoie Document| B[API REST]
        A --> |4. Pose Question| B
    end

    subgraph "Couche API"
        B --> |2. Traitement| C[RAG Engine]
    end

    subgraph "RAG Engine"
        C --> |3a. Génère Embedding| D[OpenAI API]
        C --> |3b. Stocke| E[PostgreSQL + pgvector]
        C --> |5a. Recherche Documents Similaires| E
        C --> |5b. Génère Réponse| D
    end

    subgraph "Base de Données"
        E --> |Documents| F[Table Documents]
        F --> |id| G[TEXT]
        F --> |content| H[TEXT]
        F --> |metadata| I[JSONB]
        F --> |embedding| J[VECTOR]
    end

    D --> |Réponse| C
    C --> |6. Réponse Finale| B
    B --> |7. Résultat| A

    classDef api fill:#f9f,stroke:#333,stroke-width:2px
    classDef engine fill:#bbf,stroke:#333,stroke-width:2px
    classDef db fill:#bfb,stroke:#333,stroke-width:2px
    classDef client fill:#fbb,stroke:#333,stroke-width:2px

    class A client
    class B api
    class C engine
    class D,E db
```

### Explication du Flux

1. **Ajout de Document**
   - Le client envoie un document via l'API REST
   - Le RAG Engine génère un embedding via OpenAI
   - Le document et son embedding sont stockés dans PostgreSQL

2. **Requête**
   - Le client pose une question
   - Le RAG Engine recherche les documents pertinents via pgvector
   - Les documents trouvés sont utilisés avec OpenAI pour générer une réponse
   - La réponse est renvoyée au client

### Composants Clés

- **API REST**: Point d'entrée pour les clients
- **RAG Engine**: Cœur du système, gère la logique métier
- **PostgreSQL + pgvector**: Stockage et recherche vectorielle
- **OpenAI API**: Génération d'embeddings et de réponses
