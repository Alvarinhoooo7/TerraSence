import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import CardHeader from './CardHeader';

export default function TabletBatteryHistory(Props) {

    return (
        <CardHeader
            title="Historial batería"
            subtitle="Carga batería"
            leftIcon="/images/cs-batteryIcon.svg"
            leftIconWidth={24}
            leftIconHeight={24}
            handleRefresh={Props.handleRefresh}
        >
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Props.data} maxBarSize={10} barGap={100} barCategoryGap={1}>
                    <CartesianGrid strokeDasharray="10 10" />
                    <XAxis dataKey="createdAt" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="battery" fill="#603BB0" />
                </BarChart>
            </ResponsiveContainer>
        </CardHeader>
    )
}
