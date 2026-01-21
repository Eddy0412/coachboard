let player;
let drawEnabled=false;
let selectedColor="#00E5FF";
let selectedColorName="Cyan";
let defaultMuted=true;

function $(id){return document.getElementById(id);}

function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    videoId:'NaDlpd6wZj0',
    playerVars:{controls:0,rel:0,modestbranding:1},
    events:{
      onReady:()=>{
        if(defaultMuted) player.mute();
        updateMuteUI();
      }
    }
  });
}

function updateMuteUI(){
  const b=$('muteBtn');
  if(!player||!b) return;
  b.textContent=player.isMuted()?'🔇':'🔊';
}

$('muteBtn').onclick=()=>{
  if(player.isMuted()) player.unMute(); else player.mute();
  updateMuteUI();
};

$('drawToggleBtn').onclick=()=>{
  drawEnabled=!drawEnabled;
  $('drawLabel').textContent='Draw: '+(drawEnabled?'On':'Off');
};

$('colorBtn').onclick=(e)=>{
  e.stopPropagation();
  $('colorMenu').classList.toggle('is-open');
};

document.addEventListener('click',()=> $('colorMenu').classList.remove('is-open'));

$('colorMenu').onclick=(e)=>{
  const btn=e.target.closest('.colorItem');
  if(!btn) return;
  selectedColor=btn.dataset.color;
  selectedColorName=btn.dataset.name;
  $('activeColorDot').style.background=selectedColor;
  $('colorDotLg').style.background=selectedColor;
  $('colorBtnLabel').textContent=selectedColorName;
  $('colorMenu').classList.remove('is-open');
};
