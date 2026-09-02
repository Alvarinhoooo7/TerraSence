import * as React from 'react';
import { DatePicker } from 'antd';
import CardHeader from './CardHeader';
import DugHistoryCard from './DugHistoryCard';

const { RangePicker } = DatePicker;

export default function TabletDugHistory({ dugHistory = [], handleRefresh, setDugFromDate, setDugToDate }) {
    return (
        <CardHeader
            title="Historial de Dugs"
            subtitle="Tablet"
            leftIcon="/images/tableIcons/cs-history.svg"
            leftIconWidth={23}
            leftIconHeight={23}
            handleRefresh={handleRefresh}
        >
            <RangePicker
                onChange={(dates, dateString) => {
                    setDugFromDate(dateString[0]);
                    setDugToDate(dateString[1]);
                }}
            />
            <div className="max-w-full mt-3 flex flex-wrap overflow-auto max-h-[300px]">
                {dugHistory.map((item, index) => (
                    <DugHistoryCard
                        key={index}
                        image={item.image}
                        date={item.date}
                        category={item.category}
                        app={item.app}
                        time={item.time}
                    />
                ))}
            </div>
        </CardHeader>
    );
}
