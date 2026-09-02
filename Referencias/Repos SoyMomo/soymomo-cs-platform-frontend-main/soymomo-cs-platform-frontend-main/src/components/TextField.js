import styles from '../styles/TextField.module.css'


export default function TextField(props) {
    // const [value, setValue] = useState('')
    const handleChange = (e) => {
        props.setValue(e.target.value)
    }

    return (
        <input
            className={styles.textField}
            type={props.type}
            placeholder={props.label}
            value={props.value}
            // onChange={(e) => {Props.setValue(e.target.value)}}
            onChange={handleChange}
        />
    )
}