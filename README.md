# Hud-Hud Web Chat

## Tech Stack & Dependencies

To complete the setup as requested (Part 1), here are the required dependencies you would typically install via `npm` or `yarn` in your local environment.

### Core
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `vite`: ^5.0.0 (Build tool)
- `typescript`: ^5.0.0

### Styling
- `tailwindcss`: ^3.3.0
- `autoprefixer`: ^10.4.0
- `postcss`: ^8.4.0
- `clsx`: ^2.0.0 (For conditional class merging)
- `tailwind-merge`: ^2.0.0

### Icons
- `lucide-react`: ^0.292.0 (Modern, clean icons)

### Backend & Services (Future Implementation)
- `firebase`: ^10.7.0
- `axios`: ^1.6.0 (For custom API Gateway)
- `socket.io-client`: ^4.7.0 (If not using Firestore realtime listeners exclusively)

### State Management
- `zustand`: ^4.4.0 (Recommended for scalable global state, lighter than Redux)

### Utilities
- `date-fns`: ^2.30.0 (Date formatting)

## Project Structure

- `/components`: Reusable UI components (atoms/molecules).
- `/layouts`: Main page layouts.
- `/services`: API calls, Firebase configuration, and logic.
- `/hooks`: Custom React hooks.
- `/types`: TypeScript interfaces.
- `/assets`: Static files.
