(function(global){
	/*
	select columns page
	*/
	var PageTwo = Backbone.View.extend({     
	
		el: '#page2',
		model: global.mainmodel,	
		events: {
		    "click .next-button":"nextFunction"  //next button
		},		
		initialize: function(){
			$("#sortable1, #sortable2").sortable({   //combine selected and unselected div
			    connectWith: ".connectedSortable",
				opacity: 0.7
			}).disableSelection();
			
			$("#sortable1, #sortable2").find('.col-button').dblclick(function(){  //dbclick to mark
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
		nextFunction:function(){ 		//store the selected columns and go the page3
			var cols = [];
			//save the selected columns into mainmodel
			for(var i=0;i<$("#sortable1").find(".col-button").length;i++){
				cols.push($("#sortable1").find(".col-button").eq(i).html());
			}	
			global.mainmodel.set('columnData', cols);		
			global.mainmodel.set('mainWindow','page3');
		},
	});
	
	global.PageTwo = PageTwo;

}(BX));







