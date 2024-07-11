
const dieArray=[]; //initializes an array with the length of Quantity
let value=0;
let quantity=0;


function rollDice()
{
    let convertedValue = Number(value); //forces value string type to number type
    for (let i=quantity; i>0; i--)
    {
        dieArray.push(Math.floor(Math.random()*(convertedValue)+1)); //Generates a random number between 1 and value
    }
    return dieArray;
}

function displayDice() //updates dieDisplay element to show rolled dice
{
    document.getElementById("dieDisplay").innerHTML ="";
    for (i=dieArray.length; i>0; i--)
    {
        document.getElementById("dieDisplay").innerHTML +='<div id="D' + value + 'display">' + dieArray[i-1] + '</div>'; //updates div id to select specific CSS selector
    }
}

function dieTotal() //sums and displays the total value of dice rolled
{
    let dieArraySum=0;
    for (i=dieArray.length; i>0; i--)
    {
        dieArraySum+=Number(dieArray[i-1]);
    }
    document.getElementById("dieTotal").innerHTML = "Total of Roll:" + dieArraySum;
}

function doDiceRoll() //runs all the functions after the button is clicked
{
    dieArray.length=0;
   // let dieValue=document.getElementById("dieValue").value;
   // let dieQuantity=document.getElementById("dieQuantity").value;
    rollDice();
    displayDice();
    dieTotal();
}

function setDieValue(dieButtonValue) //sets the value of the die basedon the id of the die value button selected
{
    value=0;

    document.querySelector("#D4button").style.backgroundColor="";
    document.querySelector("#D6button").style.backgroundColor="";
    document.querySelector("#D8button").style.backgroundColor="";
    document.querySelector("#D10button").style.backgroundColor="";
    document.querySelector("#D12button").style.backgroundColor="";
    document.querySelector("#D20button").style.backgroundColor="";

    switch (dieButtonValue)
    {
        case 4:
            document.getElementById("D4button").style.backgroundColor="#700000";
            break;
        case 6:
            document.getElementById("D6button").style.backgroundColor="#700000";
            break;
        case 8:
            document.getElementById("D8button").style.backgroundColor="#700000";
            break;
        case 10:
            document.getElementById("D10button").style.backgroundColor="#700000";
            break;
        case 12:
            document.getElementById("D12button").style.backgroundColor="#700000";
            break;
        case 20:
            document.getElementById("D20button").style.backgroundColor="#700000";
            break;
        case 100:
            document.getElementById("D100button").style.backgroundColor="#700000";
            break;
    }
    value = dieButtonValue;
}

function setDieQuantity(dieButtonQuantity) //sets the quantity of the die value based on the die quantity button selected
{
    quantity=0;

    document.querySelector("#Q1button").style.backgroundColor="";
    document.querySelector("#Q2button").style.backgroundColor="";
    document.querySelector("#Q3button").style.backgroundColor="";
    document.querySelector("#Q4button").style.backgroundColor="";
    document.querySelector("#Q5button").style.backgroundColor="";
    document.querySelector("#Q6button").style.backgroundColor="";
    document.querySelector("#Q7button").style.backgroundColor="";
    document.querySelector("#Q8button").style.backgroundColor="";
    document.querySelector("#Q9button").style.backgroundColor="";
    document.querySelector("#Q10button").style.backgroundColor="";


    switch (dieButtonQuantity)
    {
        case 1:
            document.getElementById("Q1button").style.backgroundColor="#700000";
            break;
        case 2:
            document.getElementById("Q2button").style.backgroundColor="#700000";
            break;
        case 3:
            document.getElementById("Q3button").style.backgroundColor="#700000";
            break;
        case 4:
            document.getElementById("Q4button").style.backgroundColor="#700000";
            break;
        case 5:
            document.getElementById("Q5button").style.backgroundColor="#700000";
            break;
        case 6:
            document.getElementById("Q6button").style.backgroundColor="#700000";
            break;
        case 7:
            document.getElementById("Q7button").style.backgroundColor="#700000";
            break;
        case 8:
            document.getElementById("Q8button").style.backgroundColor="#700000";
            break;
        case 9:
            document.getElementById("Q9button").style.backgroundColor="#700000";
            break;
        case 10:
            document.getElementById("Q10button").style.backgroundColor="#700000";
            break;
    }
    quantity = dieButtonQuantity;
}