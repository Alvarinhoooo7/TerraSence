import LoginForm from "../components/LoginForm"
import styles from "../styles/ChangePasswordPage.module.css"
// import { useNavigate } from "react-router-dom";
// import { deleteCookie } from '../utils/cookies';


export default function Login() {

    // const navigate = useNavigate();

    // const handlePasswordResetClick = () => {
    //     deleteCookie('session');
    //     navigate('/change-password')
        
    //     // window.location.href = '/change-password';
    // }
    
    return (
        <div className={styles.generalContainer}>
            <div className={styles.card}>
                <div className={styles.logoContainer}>
                <img src="images/cs-loginSoyMomoImage.svg" width={100} height={100} className={styles.momoImg} alt="SoyMomo logo"/>
                </div>


                <h1 className={styles.title}>Log in</h1>
                


                <LoginForm/>
                <a href='/change-password'>
                    <h3 className={styles.link}>¿Olvidaste tu contraseña?</h3>
                </a>
                <img src="images/cs-loginSoyMomoLogo.svg" width={100} height={100} className={styles.logo} alt="logo"/>

            </div>
        </div>
    )
}