/* These scripts load the header, nav, and footer elements, so they do not need to be repeated in each HTML page. */

function navLoader()
{
    document.querySelector("nav").innerHTML+="           <section class='navButtons'><a href='index.html'>Home</a></section>";
    document.querySelector("nav").innerHTML+="           <section class='navButtons'><a href='final-dice-roller.html'>Dice Roller</a></section>";
    document.querySelector("nav").innerHTML+="           <section class='navButtons'><a href='final-character-generator.html'>Random Character Generator</a></section>";
    document.querySelector("nav").innerHTML+="           <section class='navButtons'><a href='random-encounter-charts.html'>Random Encounter Charts</a></section>";
    document.querySelector("nav").innerHTML+="           <section class='navButtons'><a href='custom-treasure-list.html'>Custom Treasure List</a></section>";

}


function headerLoader()
{
    document.querySelector("header").innerHTML="<span><h1>Tim's Dungeon Master Tools</h1></span>";
}

function footerLoader()
{
    document.querySelector("footer").innerHTML="<span>Website created by Tim Russell. Javascript including dice roller and character generator are customer projects developed by Tim Russell. Custom Treasure list items created and copyright by &copy; Tim Russell. Last updated: 8/14/2023.</span>"
    document.querySelector("footer").innerHTML+="<div>For more by Tim Russell, visit <a href='https://www.TimothyRussellDesign.com' target='_blank'>TimothyRussellDesign.com</a></div>";
    document.querySelector("footer").innerHTML+="<div style='width: 100px'><a  href='https://www.TimothyRussellDesign.com' target='_blank'><img style='width:100%; display:block;' src='images/TimothyRussellDesignLogo2023.png'></a></div>";
}

