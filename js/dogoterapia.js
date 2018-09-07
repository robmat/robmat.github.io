$(document).ready(function() {
     Galleria.loadTheme('js/galleria/themes/classic/galleria.classic.min.js');

     $('a.galery-link1').popup({
        afterOpen: function() {
            Galleria.run('.galleria');
        }
     });

     $('a.galery-link2').popup({
             afterOpen: function() {
                 Galleria.run('.galleria');
             }
          });

      $('a.galery-link3').popup({
              afterOpen: function() {
                  Galleria.run('.galleria');
              }
           });
});

function showMenuItem(contentItemId) {
    $('#nav li').removeClass('home');
    $('#nav li'+contentItemId+'-menu-item').addClass('home');
    $('.closable-openable:visible').fadeOut(500, function() {
            $(contentItemId).fadeIn(500);
        }
    );

}