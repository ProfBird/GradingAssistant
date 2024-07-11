

function backgroundChanger()
{
        if (redUpOrDown =="down" && red > 5)
        {
            document.body.style.backgroundColor = "rgb(" +red +", 0, 0)";
            red--;
        }
        else if (redUpOrDown =="down" && red == 5)
        {
            document.body.style.backgroundColor = "rgb(" +red +", 0, 0)";
            redUpOrDown = "up";
        }
        else if (redUpOrDown =="up" && red < 50)
        {
            document.body.style.backgroundColor = "rgb(" +red +", 0, 0)";
            red++;
        }
        else if (redUpOrDown =="up" && red == 50)
        {
            document.body.style.backgroundColor = "rgb(" +red +", 0, 0)";
            redUpOrDown = "down";
        }
}
