graph TB
subgraph "Client Browser"
subgraph "React Application"
subgraph "UI Layer"
Login[Login Component]
Signup[Signup Component]
Canvas[Canvas Component]
CanvasObj[CanvasObject Component]
Controls[CanvasControls Component]
CursorLayer[CursorLayer Component]
Cursor[Cursor Component]
PresenceList[PresenceList Component]
Header[Header Component]
Sidebar[Sidebar Component]
end

            subgraph "State Management"
                AuthCtx[AuthContext]
                CanvasCtx[CanvasContext]
            end

            subgraph "Custom Hooks"
                useAuth[useAuth Hook]
                useCanvas[useCanvas Hook]
                usePresence[usePresence Hook]
                useRealtimeSync[useRealtimeSync Hook]
            end

            subgraph "Services Layer"
                AuthService[authService]
                CanvasService[canvasService]
                PresenceService[presenceService]
                FirebaseInit[firebase.ts]
            end

            subgraph "Utilities"
                CanvasHelpers[canvasHelpers]
                SyncHelpers[syncHelpers]
            end

            subgraph "Constants"
                CanvasConstants[canvas.ts - DEFAULT_CANVAS_ID]
            end

            subgraph "Canvas Rendering"
                Konva[Konva.js Library]
                ReactKonva[react-konva]
            end
        end
    end

    subgraph "Firebase Backend"
        subgraph "Firebase Services"
            FirebaseAuth[Firebase Authentication]
            RealtimeDB[Firebase Realtime Database]
            Hosting[Firebase Hosting]
        end

        subgraph "Database Structure (MVP: Single Canvas)"
            CanvasDefault["/canvases/default"]
            ObjectsNode["/canvases/default/objects/{objectId}"]
            UsersNode["/users/{userId}"]
            PresenceDefault["/presence/default/{userId}"]
            Note["Note: 'default' is hardcoded for MVP<br/>Structure supports multiple canvases post-MVP"]
        end
    end

    subgraph "External Libraries"
        ReactRouter[React Router]
        TypeScript[TypeScript]
        Vite[Vite Build Tool]
    end

    %% UI to State Management
    Login --> AuthCtx
    Signup --> AuthCtx
    Canvas --> CanvasCtx
    CanvasObj --> CanvasCtx
    Controls --> CanvasCtx
    CursorLayer --> usePresence
    Cursor --> usePresence
    PresenceList --> usePresence

    %% State to Hooks
    AuthCtx --> useAuth
    CanvasCtx --> useCanvas
    CanvasCtx --> useRealtimeSync

    %% Hooks to Services
    useAuth --> AuthService
    useCanvas --> CanvasService
    usePresence --> PresenceService
    useRealtimeSync --> CanvasService
    useRealtimeSync --> SyncHelpers

    %% Services to Firebase Init
    AuthService --> FirebaseInit
    CanvasService --> FirebaseInit
    PresenceService --> FirebaseInit

    %% Services use Constants
    CanvasService --> CanvasConstants
    PresenceService --> CanvasConstants

    %% Canvas Rendering
    Canvas --> ReactKonva
    CanvasObj --> ReactKonva
    ReactKonva --> Konva
    Canvas --> CanvasHelpers

    %% Firebase Init to Firebase Services
    FirebaseInit -.->|SDK| FirebaseAuth
    FirebaseInit -.->|SDK| RealtimeDB

    %% Authentication Flow
    AuthService -.->|signUp/signIn/signInWithGoogle/signOut| FirebaseAuth
    FirebaseAuth -.->|User Session + Google OAuth| AuthService

    %% Real-time Database Operations
    CanvasService -.->|Write/Update/Delete Objects| RealtimeDB
    CanvasService -.->|Read Objects| RealtimeDB
    RealtimeDB -.->|Real-time Updates| CanvasService

    PresenceService -.->|Write Presence| RealtimeDB
    PresenceService -.->|Write Cursor Position| RealtimeDB
    RealtimeDB -.->|Presence Updates| PresenceService
    RealtimeDB -.->|Cursor Updates| PresenceService

    %% Database Structure
    RealtimeDB --> CanvasDefault
    CanvasDefault --> ObjectsNode
    RealtimeDB --> UsersNode
    RealtimeDB --> PresenceDefault

    %% Application Routing
    ReactRouter -.->|Route Management| Login
    ReactRouter -.->|Route Management| Signup
    ReactRouter -.->|Route Management| Canvas

    %% Build Process
    Vite -.->|Bundle & Build| ReactRouter
    TypeScript -.->|Type Safety| AuthService
    TypeScript -.->|Type Safety| CanvasService
    TypeScript -.->|Type Safety| PresenceService

    %% Deployment
    Vite -.->|Production Build| Hosting
    Hosting -.->|Serves Application| Login

    style FirebaseAuth fill:#FFA500
    style RealtimeDB fill:#FFA500
    style Hosting fill:#FFA500
    style Konva fill:#90EE90
    style ReactKonva fill:#90EE90
    style TypeScript fill:#4169E1
    style Vite fill:#9370DB
    style ReactRouter fill:#61DAFB
