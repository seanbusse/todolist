console.log("Javascript is working");

//Set the dynamic date string
const today = new Date;
const year = today.toLocaleDateString('en-CA', {year: 'numeric'});
$(function() {
    $('.year').text(year);
});