import { FC } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { AuthProvider } from '../contexts/AuthContext';
import router from '../router';

// The Stage 0-4 demo (PostsList/Post/ListGroup/RegistrationForm/StudentForm,
// usePosts, post-service.ts) is intentionally no longer referenced from
// here - the files remain on disk as course reference, untouched.
const App: FC = () => (
  <Provider store={store}>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </Provider>
);

export default App;
