import { Container, Card, Form, Button } from 'react-bootstrap';
const PercentageButtons = ({userBalance,setAmount})=>{
    const handlePercentClick = (percentage, e) => {
        // Handle zero balance (0 * percentage = 0) but not negative or null/undefined
        if (userBalance !== null && userBalance !== undefined && userBalance >= 0) {
            const newAmount = (userBalance * percentage) / 100;
            setAmount(newAmount.toFixed(4).toString());
            console.log('Setting amount to:', newAmount);
        }
    };
    return(
        <div>
                <button 
                    style={{
                        background: 'transparent',
                        border: 'none'
                    }}
                    onClick={() => handlePercentClick(25)}>25%</button>
                <button 
                    style={{
                        background: 'transparent',
                        border: 'none'
                    }}
                    onClick={() => handlePercentClick(50)}>50%</button>
                <button 
                    style={{
                        background: 'transparent',
                        border: 'none'
                    }}
                    onClick={() => handlePercentClick(75)}>75%</button>
                     <button 
                    style={{
                        background: 'transparent',
                        border: 'none'
                    }}
                    onClick={() => handlePercentClick(100)}>MAX</button>
               
                </div>
                 )

}
export default PercentageButtons