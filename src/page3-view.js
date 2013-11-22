(function(global){
	
	var PageThree = Backbone.View.extend({      //select sites window view
	
		el: '#page3',
		model: global.mainmodel,	
		events: {
		    "click .build-button":"buildTable"
		},		
		initialize: function(){
			$("#sortable1, #sortable2").sortable({
			    connectWith: ".connectedSortable",
				opacity: 0.7
			}).disableSelection();
			$("#sortable1, #sortable2").find('.col-button').dblclick(function(){
				if($(this).parents("#sortable1").length){
					if($(this).hasClass('selected')){					
						$(this).removeClass('selected');
					}
					else{
						$(this).addClass('selected');
					}	
				}						
			});
			$("#sortable2").on("change", function(event, ui){
				$("#sortable2").find(".col-button").removeClass('selected');
			});
		},
		buildTable:function(){
			var cols = [];
			for(var i=0;i<$("#sortable1").find(".col-button").length;i++){
				cols.push($("#sortable1").find(".col-button").eq(i).html());
			}	
			global.mainmodel.set('columnData', cols);		
			global.getData();
			global.mainmodel.set('mainWindow','page4');
		},
	});
	
	global.PageThree = PageThree;

}(BX));







