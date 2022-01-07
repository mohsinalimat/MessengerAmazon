import AuthContext from 'contexts/AmplifyContext';
import { useContext } from 'react';

const useAuth = () => useContext(AuthContext);

export default useAuth;
