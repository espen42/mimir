import $ from 'jquery'

export function init() {
  $(function() {
    // Custom padding for container box (border-top-green)
    $('.part-related-kostra .border-top-green').css({
      'padding-top': '20px',
      'padding-bottom': '30px',
      'padding-left': '120px',
      'padding-right': '120px'
    })
  })
}
