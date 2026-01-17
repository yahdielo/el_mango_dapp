import { Button } from 'react-bootstrap';

const ConnectedButton = ({chain}) => {  
    return(
        <Button 
            className="w-100"
            style={{
                padding: "1rem",
                fontSize: "1.5rem",
                backgroundColor: "#F26E01", // Mango orange
                borderColor: "#FFA500", // Match the border color
                color: "#FFFFFF", // White text for contrast
            }}
            >{`Connected`}</Button>
    );
}
export default ConnectedButton;