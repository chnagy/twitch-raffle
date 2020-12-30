$(function(){
    $('#actual-btn').change(function(){
        $('#span').html($('#actual-btn').val().split('\\').pop());
    });
});