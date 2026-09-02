import React, { useState } from "react";
import TextField from "./TextField"
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Cookies from 'js-cookie';
import { useAuth } from '../authContext';
import styles from "../styles/ChangePasswordForm.module.css"
import { checkPasswordFormat } from "../utils/formater";


// Solo funciona para cambiar la clave por primera vez
// Se mantiene así pues para hacer un cambio de contraseña seguro se necesita un mailer
// o algo por el estilo.
export default function ChangePasswordForm() {
    const navigate = useNavigate();
    const { setTokens } = useAuth();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const email = queryParams.get('email');
    
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);  // Loading state

    const session = Cookies.get('session');

    async function handleSubmit() {
        setLoading(true)

        if (!checkPasswordFormat(newPassword)){
            setError("La contraseña no cumple con los requisitos pedidos")
            setLoading(false)
            return;
        }

        try {
            const response = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/auth/respondToAuthChallenge', {
                challengeName: 'NEW_PASSWORD_REQUIRED',
                challengeResponses: {
                    USERNAME: email, // assuming `email` is in scope
                    NEW_PASSWORD: newPassword,
                },
                session,
            });

            if (response.data.challengeName && response.data.challengeName === 'MFA_SETUP') {
                // MFA is required to complete sign in
                // override session cookie with new session
                Cookies.set('session', response.data.session);
            }
            
            // Login again with the new password
            const signInResponse = await axios.post(process.env.REACT_APP_BACKEND_HOST + '/auth/login', {
                email,
                password: newPassword,
            });

            
            if (signInResponse.data.error) {
                setError("Your email or password is incorrect.")
            } else {
                // console.log(signInResponse.data)
                setTokens(signInResponse.data);
                navigate('/')
            }

        } catch (error) {
            setError(error.message || 'Something went wrong.');
        }
        
        setLoading(false)
    }

    return (
        <div>
            {error && (
                <span className={styles.errorContainer}>
                    {error}
                </span>
            )}
            <TextField label="New Password" type="password" setValue={setNewPassword} value={newPassword}/>

            <button
                onClick={handleSubmit}
                disabled={loading}
                className={styles.submitBtn}
            >
                {loading ? 'Loading...' : 'Change password'}
            </button>
        </div>
    )
}
