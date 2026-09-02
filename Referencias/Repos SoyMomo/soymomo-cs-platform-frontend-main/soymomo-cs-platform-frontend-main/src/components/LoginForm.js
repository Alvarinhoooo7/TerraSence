import { useState } from "react";
import React from 'react';
import TextField from "./TextField"
import axios from "axios";
import { useAuth } from "../authContext";
import { useNavigate } from "react-router-dom";
import Cookies from 'js-cookie';
import styles from '../styles/LoginForm.module.css'


export default function LoginForm() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);  // Loading state
    const { setTokens } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit() {
        // start loading
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                process.env.REACT_APP_BACKEND_HOST + "/auth/login",
                {
                    email,
                    password,
                }
            );
            if (response.data.challengeName && response.data.challengeName === 'NEW_PASSWORD_REQUIRED') {
                // navegar a vista cambiar contraseña
                Cookies.set('session', response.data.session);
                navigate('/change-password?email=' + email);
            }else {
                // iniciar sesión y navegar a dashboard
                setTokens(response.data);
                navigate('/');
            }
        } catch (error) {
            // handle the error
            if (error.response && error.response.status === 401) {
                setError("Email y/o contraseña inválidos")
            } else {
                setError(error.message || "Something went wrong.");
            }
        } finally {
            // stop loading
            setLoading(false);
        }
    }
    
    return (
        <div>
            {error && (
                <span className={styles.errorText}>
                    {error}
                </span>
            )}
            <TextField label="Email" type="email" setValue={setEmail} value={email}/>

            <TextField label="Contraseña" type="password" setValue={setPassword} value={password}/>

            <button
                onClick={handleSubmit}
                disabled={loading}
                className={styles.submitBtn}
            >
                {loading? "Loading..." : "Log in"} 
            </button>
        </div>
    )
}