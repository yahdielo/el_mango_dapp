import SelectTokenButton from './selecTokenButton.js';
import { Container, Card, Form, Button } from 'react-bootstrap';


const InputBox1 = ({
    placeHolder,// this is the expected amountOut we display to user
    value,// amount2
    onChange,//handles on change
    //the params bellow is for the tokenSelection button
    isSelected,token,onClick
    })=>{

   return(
      <Card className="swap-card" 
      style={{backgroundColor:'rgba(255, 255, 255, 0.72)'}}>
          <Card.Body>
            {/* Top buttons (Swap, Limit, Buy, Sell) */}
            {/* <div className="swap-mode-buttons">
              <button className="mode-button active">Swap</button>
              <button className="mode-button">Limit</button>
              <button className="mode-button">Buy</button>
              <button className="mode-button">Sell</button>
            </div> */}
    
            {/* Input section */}
            <div 
            className="token-input-container"
            style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                paddingTop:'15px',
                paddingBottom: '15px', 
                }}
            //onMouseEnter={() => setShowPercentButtons(true)}
            //onMouseLeave={() => setShowPercentButtons(false)}
            >
                <div className="input-row" style={{}}>
                    <Form.Control
                    type="text"
                    placeholder={!placeHolder ? '0.0':placeHolder}
                    value={value}
                    onChange={ onChange}
                 
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'black',
                        fontSize: '2rem', // Larger font size
                        fontWeight: '500',
                        padding: '0',
                        width: '100%',
                        boxShadow: 'none',
                        height: '100%' // Take full height
                }}
                    />  
                </div>
                    <div class='tokenButtonSelect' style={{
                        // Fixed width to match balance area
                        }}>
                    <SelectTokenButton isSelected={isSelected} token={token} onClick={onClick} />
                    </div>
            </div>
          </Card.Body>
        </Card>
   )

}
export default InputBox1