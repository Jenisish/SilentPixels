```mermaid
flowchart TD
    %% Frontend (Client-Side Application)
    subgraph Frontend [Client \(React SPA)\]
      A[Main App Component<br>(App.tsx)]
      B[Authentication Components<br>(Login, Signup, ResetPassword)]
      C[File Management Components<br>(FileUpload, ImagePreview, MediaPreview)]
      D[User Interaction Components<br>(History, Settings)]
    end

    %% Business Logic Layer
    subgraph BusinessLogic [Business Logic]
      E[Steganography Service<br>(steganography.ts)]
    end

    %% Backend (Supabase)
    subgraph Backend [Backend (Supabase)]
      F[Authentication Service<br>(Supabase Auth)]
      G[Database<br>(Profiles, History)]
    end

    %% Interactions
    A --> B
    A --> C
    A --> D
    C -- "Uploads & Previews File" --> A
    A -- "Invokes Encoding/Decoding" --> E
    E -- "Processes Media File" --> A
    A -- "Authentication Events & Session Management" --> F
    F -- "User Session & Metadata" --> A
    A -- "Logs & Updates User Actions" --> G
    F -- "Syncs with User Profiles" --> G

