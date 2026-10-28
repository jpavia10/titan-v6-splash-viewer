import bpy,math,random,os,mathutils as mu
from mathutils import Vector,Euler
FPS=24;BOOM=197;END=360
sc=bpy.context.scene
for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
sc.render.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=int(os.environ.get('SPP','96'));sc.cycles.use_adaptive_sampling=True;sc.cycles.adaptive_threshold=.02
sc.cycles.use_denoising=True;sc.cycles.denoiser='OPENIMAGEDENOISE';sc.cycles.max_bounces=10;sc.cycles.transmission_bounces=10;sc.cycles.volume_bounces=1;sc.cycles.caustics_reflective=False;sc.cycles.caustics_refractive=False
sc.cycles.sample_clamp_indirect=4.0;sc.cycles.blur_glossy=.5
sc.render.resolution_x=720;sc.render.resolution_y=1280;sc.render.resolution_percentage=int(os.environ.get('PCT','50'))
sc.render.fps=FPS;sc.frame_start=0;sc.frame_end=END
sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast'
sc.render.use_motion_blur=True;sc.render.motion_blur_shutter=.35
sc.render.film_transparent=False
# world: near-black cool gradient
w=bpy.data.worlds.new('W');sc.world=w;w.use_nodes=True;bg=w.node_tree.nodes['Background'];bg.inputs[0].default_value=(.004,.005,.007,1);bg.inputs[1].default_value=1
# ---------- hero
bpy.ops.wm.ply_import(filepath='/workspace/obs8/hero9.ply')
hero=bpy.context.selected_objects[0];hero.name='hero'
hero.rotation_euler=(math.radians(90),0,0);bpy.ops.object.transform_apply(rotation=True)
hero.scale=(.84,.84,.84);bpy.context.view_layer.update();bpy.ops.object.transform_apply(scale=True)
bz=min(v.co.z for v in hero.data.vertices);hero.location.z=-bz-.02
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=1e-5);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()
import bmesh
_b=bmesh.new();_b.from_mesh(hero.data);print('NONMANIFOLD',sum(1 for e in _b.edges if not e.is_manifold),'V',len(_b.verts));_b.free()
m=bpy.data.materials.new('obsidian');m.use_nodes=True;nt=m.node_tree;N=nt.nodes;Lk=nt.links;p=N['Principled BSDF']
p.inputs['Base Color'].default_value=(.85,.62,.45,1);p.inputs['Roughness'].default_value=.015;p.inputs['IOR'].default_value=1.49
p.inputs['Transmission Weight'].default_value=float(os.environ.get('TW','1'));p.inputs['Coat Weight'].default_value=.6;p.inputs['Coat IOR'].default_value=1.5
tc=N.new('ShaderNodeTexCoord');img=N.new('ShaderNodeTexImage');img.image=bpy.data.images.load('/workspace/obs8/scratch.png');img.projection='BOX';img.projection_blend=.3;img.image.colorspace_settings.name='Non-Color'
mp=N.new('ShaderNodeMapping');mp.inputs['Scale'].default_value=(1.2,1.2,1.2);Lk.new(tc.outputs['Object'],mp.inputs[0]);Lk.new(mp.outputs[0],img.inputs[0])
mr=N.new('ShaderNodeMapRange');mr.inputs[3].default_value=0.0;mr.inputs[4].default_value=.35;Lk.new(img.outputs[0],mr.inputs[0]);Lk.new(mr.outputs[0],p.inputs['Coat Roughness'])
va=N.new('ShaderNodeVolumeAbsorption');va.inputs['Color'].default_value=(.9,.86,.82,1);va.inputs['Density'].default_value=float(os.environ.get('DENS','1400'))
Lk.new(va.outputs[0],N['Material Output'].inputs['Volume'])
nzc=N.new('ShaderNodeTexNoise');nzc.inputs['Scale'].default_value=9;nzc.inputs['Detail'].default_value=6;bmc=N.new('ShaderNodeBump');bmc.inputs['Strength'].default_value=.035
Lk.new(tc.outputs['Object'],nzc.inputs['Vector']);Lk.new(nzc.outputs[0],bmc.inputs['Height']);Lk.new(bmc.outputs[0],p.inputs['Coat Normal'])
sk=N.new('ShaderNodeBump');sk.inputs['Strength'].default_value=.08;Lk.new(img.outputs[0],sk.inputs['Height']);Lk.new(sk.outputs[0],p.inputs['Normal'])
p.inputs['Roughness'].default_value=.035;p.inputs['Anisotropic'].default_value=.25
hero.data.materials.append(m)
# chip material: same glass but opaque-ish (no volume) to save time
cm=m.copy();cm.name='chip';cn=cm.node_tree.nodes;cp=cn['Principled BSDF'];cp.inputs['Transmission Weight'].default_value=.0;cp.inputs['Base Color'].default_value=(.012,.01,.01,1);cp.inputs['Roughness'].default_value=.02;cp.inputs['Specular IOR Level'].default_value=.5;cp.inputs['Coat Weight'].default_value=1.0;cp.inputs['Base Color'].default_value=(.004,.0035,.0035,1)
for l in list(cm.node_tree.links):
    if l.to_socket.name=='Volume':cm.node_tree.links.remove(l)
# ---------- floor: dark slate
bpy.ops.mesh.primitive_plane_add(size=40);fl=bpy.context.object;fm=bpy.data.materials.new('slate');fm.use_nodes=True;fn=fm.node_tree.nodes;fp=fn['Principled BSDF']
fp.inputs['Base Color'].default_value=(.0035,.0035,.004,1);fp.inputs['Roughness'].default_value=.42;fp.inputs['Coat Weight'].default_value=.0;fp.inputs['Specular IOR Level'].default_value=.18
nz=fn.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=14;nz.inputs['Detail'].default_value=12;bm=fn.new('ShaderNodeBump');bm.inputs['Strength'].default_value=.25
fm.node_tree.links.new(nz.outputs[0],bm.inputs['Height']);fm.node_tree.links.new(bm.outputs[0],fp.inputs['Normal'])
nz2=fn.new('ShaderNodeTexNoise');nz2.inputs['Scale'].default_value=2.5;cr=fn.new('ShaderNodeMapRange');cr.inputs[3].default_value=.7;cr.inputs[4].default_value=1.0
fm.node_tree.links.new(nz2.outputs[0],cr.inputs[0]);fm.node_tree.links.new(cr.outputs[0],fp.inputs['Roughness'])
fl.data.materials.append(fm);col=fl.modifiers.new('c','COLLISION');fl.collision.damping=.6;fl.collision.friction_factor=.7
# ---------- lights (all studio panels; keyframed strengths)
def area(name,loc,rot,size,sy,color,power,shape='RECTANGLE',cam=False):
    L=bpy.data.lights.new(name,'AREA');L.shape=shape;L.size=size;L.size_y=sy;L.color=color;L.energy=power
    o=bpy.data.objects.new(name,L);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.visible_camera=cam;return o
def aim(o,t=(0,0,1.4)):d=Vector(t)-o.location;o.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
key=area('key',(3.4,-1.2,4.4),(0,0,0),2.4,1.2,(1,.78,.55),900);aim(key);key.data.spread=math.radians(20)
rimL=area('rimL',(-3.0,2.6,2.2),(0,0,0),.35,4.5,(.6,.75,1),700);aim(rimL)
rimR=area('rimR',(2.6,3.2,1.8),(0,0,0),.3,4.0,(.75,.85,1),350);aim(rimR)
top=area('top',(0,0.4,5.5),(0,0,0),3.5,.5,(1,.95,.9),260);aim(top,(0,0,1.5))
back=area('back',(0,2.2,1.1),(0,0,0),1.2,2.6,(1,.8,.6),900);aim(back,(0,-1,1.2))
stripF=area('stripF',(-2.2,-3.2,2.6),(0,0,0),.25,3.5,(1,.9,.8),220);aim(stripF)
stripT=area('stripT',(1.2,-1.5,4.8),(0,0,0),2.5,.25,(1,.92,.85),240);aim(stripT,(0,0,1.8))
fillc=area('fill',(-4,-4,2),(0,0,0),3,3,(.5,.6,.8),60);aim(fillc)
fl_l=bpy.data.lights.new('flash','POINT');fl_l.color=(1,.72,.45);fl_l.shadow_soft_size=.3;flash=bpy.data.objects.new('flash',fl_l);flash.visible_glossy=False;flash.visible_transmission=False;sc.collection.objects.link(flash);flash.location=(0,-.35,1.3)
def kf(o,attr,pairs):
    for f,v in pairs:setattr(o.data if attr=='energy' else o,attr,v);(o.data if attr=='energy' else o).keyframe_insert(attr,frame=f)
kf(rimL,'energy',[(0,0),(30,0),(80,700)]);kf(rimR,'energy',[(0,0),(50,0),(110,350)]);kf(key,'energy',[(0,0),(62,0),(125,900)]);kf(top,'energy',[(0,0),(80,0),(140,260)])
kf(back,'energy',[(0,0),(70,0),(150,380),(BOOM-1,400),(BOOM+2,1400),(BOOM+40,520),(END,450)]);kf(fillc,'energy',[(0,0),(90,0),(150,60)]);kf(stripF,'energy',[(0,0),(100,0),(170,220)]);kf(stripT,'energy',[(0,0),(60,0),(130,240)])
kf(flash,'energy',[(0,0),(BOOM-1,0),(BOOM+1,3500),(BOOM+8,800),(BOOM+20,0)])
# ---------- debris: knapped-looking flakes (thin convex lenses, bevelled)
random.seed(5)
def flake(s):
    import bmesh
    me=bpy.data.meshes.new('fl');bmm=bmesh.new()
    pts=[]
    for k in range(18):
        a=random.random()*6.283;r=.6+.4*random.random();pts.append((math.cos(a)*r,math.sin(a)*r*(.5+random.random()*.5),(random.random()-.5)*.18))
    pts+= [(0,0,.12),(0,0,-.1)]
    for q in pts:bmm.verts.new(q)
    bmesh.ops.convex_hull(bmm,input=bmm.verts);bmm.to_mesh(me);bmm.free()
    o=bpy.data.objects.new('flake',me);sc.collection.objects.link(o);o.scale=(s,s,s);o.data.materials.append(cm)
    bv=o.modifiers.new('b','BEVEL');bv.width=.03;bv.segments=2;return o
chips=[]
for i in range(130):
    big=i<18;s=(.09+random.random()*.1) if big else (.05+random.random()*.09)
    o=flake(s)
    if big:
        ang=random.uniform(math.radians(20),math.radians(160));rr=.6+random.random()*1.4;p=Vector((math.cos(ang)*rr*(1 if random.random()<.5 else -1),abs(math.sin(ang))*rr+.2,s*.12))
    else:p=Vector(((random.random()-.5)*.35,(random.random()-.5)*.1,.3+random.random()*2.2))
    e=Euler((random.random()*6.3,random.random()*6.3,random.random()*6.3)) if not big else Euler((0,0,random.random()*6.3))
    chips.append(dict(o=o,p=p.copy(),v=Vector(),e=Vector(e),w=Vector(),s=s,big=big,live=big))
O=Vector((0,-.05,1.3))
for c in chips:
    o=c['o']
    if not c['big']:o.hide_render=True;o.keyframe_insert('hide_render',frame=0);o.hide_render=False;o.keyframe_insert('hide_render',frame=BOOM)
dt=1/FPS/4
for f in range(0,END+1):
    if f==BOOM:
        for c in chips:
            d=c['p']-O;r=max(.3,d.length);d.normalize();k=(4.2 if c['big'] else 9.0)/(r*r)*(.6+random.random()*.8)
            d.y=abs(d.y)*.8+.15   # bias debris away from camera (camera is at -y): keeps the title band clear
            c['v']+=d*k;c['v'].z+=(1.0+random.random()) if c['big'] else (1.5+random.random()*3);c['live']=True
            c['w']=Vector(((random.random()-.5)*25,(random.random()-.5)*25,(random.random()-.5)*25))
    if f>BOOM:
        for _ in range(4):
            for c in chips:
                if not c['live']:continue
                c['v'].z-=9.8*dt;c['v']*=(1-.5*dt);c['p']+=c['v']*dt;c['e']+=c['w']*dt
                if c['p'].z<c['s']*.12:
                    c['p'].z=c['s']*.12
                    if c['v'].z<0:c['v'].z*=-.25
                    c['v'].x*=.75;c['v'].y*=.75;c['w']*=.55
                    # settle flat on the slate when slow
                    if c['v'].length<.4:c['e'].x*=.8;c['e'].y*=.8
    for c in chips:
        if f in(0,BOOM-1) or f>=BOOM:
            c['o'].location=c['p'];c['o'].rotation_euler=Euler(c['e']);c['o'].keyframe_insert('location',frame=f);c['o'].keyframe_insert('rotation_euler',frame=f)
# ---------- ash + embers (particle systems with floor collision)
def ico(name,r,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=(0,0,-5));o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
am=bpy.data.materials.new('ash');am.use_nodes=True;am.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.06,.055,.05,1);am.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9
em=bpy.data.materials.new('ember');em.use_nodes=True;ep=em.node_tree.nodes['Principled BSDF'];ep.inputs['Emission Color'].default_value=(1,.45,.12,1);ep.inputs['Emission Strength'].default_value=60;ep.inputs['Base Color'].default_value=(0,0,0,1)
ashI=ico('ashI',.006,am);embI=ico('embI',.004,em)
def emitter(name,loc,r,count,inst,vel,rnd,life,drag,size_rand=.6,f0=BOOM,f1=BOOM+2):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r,location=loc);e=bpy.context.object;e.name=name
    ps=e.modifiers.new(name,'PARTICLE_SYSTEM').particle_system;st=ps.settings
    st.count=count;st.frame_start=f0;st.frame_end=f1;st.lifetime=life;st.normal_factor=vel;st.factor_random=rnd;st.drag_factor=drag
    st.render_type='OBJECT';st.instance_object=inst;st.particle_size=1;st.size_random=size_rand;st.use_rotations=True;st.rotation_factor_random=1
    st.effector_weights.gravity=1;e.show_instancer_for_render=False;e.cycles.use_motion_blur=False;inst.cycles.use_motion_blur=False;e.show_instancer_for_viewport=False;return e
emitter('ashE',(0,0,.08),.35,6000,ashI,2.2,2.4,400,.35)
emitter('ashE2',(0,-.05,1.2),.4,220,ashI,.9,.8,400,.6)
ee=emitter('embE',(0,-.1,1.1),.25,110,embI,1.3,1.4,70,.9);ee.particle_systems[0].settings.drag_factor=.9;ee.particle_systems[0].settings.effector_weights.gravity=.15
# sparse pre-boom motes (accent)
#me_=emitter('motes',(0,0,1.8),1.6,120,ashI,.02,.05,400,.0,f0=0,f1=1)
#me_.particle_systems[0].settings.effector_weights.gravity=0.0
# ---------- camera
cd=bpy.data.cameras.new('cam');cd.lens=55;cd.sensor_fit='VERTICAL';cd.sensor_height=24*16/9/1.5;cam=bpy.data.objects.new('cam',cd);sc.collection.objects.link(cam);sc.camera=cam
cd.dof.use_dof=True;cd.dof.aperture_fstop=3.2
tgt=bpy.data.objects.new('tgt',None);sc.collection.objects.link(tgt);cd.dof.focus_object=tgt
def camk(f,pos,look):
    cam.location=pos;d=Vector(look)-Vector(pos);cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
    tgt.location=look;tgt.keyframe_insert('location',frame=f)
camk(0,(1.1,-2.0,2.9),(0,0,2.55));camk(40,(1.0,-2.2,2.85),(0,0,2.5));camk(150,(2.2,-7.2,1.9),(0,0,1.45));camk(BOOM-1,(1.6,-7.6,1.8),(0,0,1.45))
for i,(dx,dz) in enumerate([(.12,-.08),(-.1,.07),(.07,-.05),(-.05,.03),(.03,-.02),(0,0)]):camk(BOOM+1+i*2,(1.6+dx,-7.35+abs(dx),1.8+dz),(0,0,1.45))
camk(250,(1.0,-8.0,1.95),(0,0,1.05));camk(END,(.6,-8.1,2.0),(0,0,1.0))
for o in (cam,tgt):
    for fc in o.animation_data.action.fcurves:
        for k in fc.keyframe_points:k.interpolation='BEZIER'
sc.render.image_settings.file_format='PNG';sc.render.filepath='/workspace/obs8/frames10/f'
def softbox(name,loc,sx,sy,col,strength,look=(0,0,1.4)):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=(sx,sy,1);aim(o,look)
    mt=bpy.data.materials.new(name);mt.use_nodes=True;n2=mt.node_tree.nodes;n2.remove(n2['Principled BSDF']);em_=n2.new('ShaderNodeEmission');em_.inputs['Color'].default_value=col
    tc2=n2.new('ShaderNodeTexCoord');gr=n2.new('ShaderNodeTexGradient');gr.gradient_type='SPHERICAL';mp2=n2.new('ShaderNodeMapping');mp2.inputs['Scale'].default_value=(2,2,1)
    mt.node_tree.links.new(tc2.outputs['Generated'],mp2.inputs[0]);mp2.inputs['Location'].default_value=(-1,-1,0)
    mt.node_tree.links.new(mp2.outputs[0],gr.inputs[0]);mr2=n2.new('ShaderNodeMapRange');mr2.inputs[4].default_value=strength
    mt.node_tree.links.new(gr.outputs[1],mr2.inputs[0]);mt.node_tree.links.new(mr2.outputs[0],em_.inputs['Strength'])
    mt.node_tree.links.new(em_.outputs[0],n2['Material Output'].inputs[0]);o.data.materials.append(mt)
    o.visible_camera=False;o.visible_diffuse=False;o.visible_shadow=False;o.visible_volume_scatter=False;return o,mr2
sbs=[softbox('sbKey',(3.2,-1.6,4.0),2.6,1.6,(1,.82,.62,1),40),softbox('sbRim',(-3.2,2.4,2.2),.5,4.5,(.65,.78,1,1),45),softbox('sbTop',(0,.3,5.2),3.5,.7,(1,.95,.9,1),25),softbox('sbFront',(-2.4,-3.4,2.4),.4,3.6,(1,.92,.85,1),22),softbox('sbCam',(1.2,-5.0,2.6),3.2,1.6,(.9,.93,1,1),3.5)]
for o,mr2 in sbs:
    for f,v in [(0,0),(55,0),(140,mr2.inputs[4].default_value)]:mr2.inputs[4].default_value=v;mr2.inputs[4].keyframe_insert('default_value',frame=f)
for n_ in ('key','rimL','rimR','top','stripF','stripT','fill','back','sweep'):
    if n_ in sc.objects:sc.objects[n_].visible_glossy=False
sc.objects.get('sweep') and setattr(sc.objects['sweep'],'visible_glossy',True)
# transitions / dynamics: a light sweep reveals the facets, hero slowly turns, jolts on the boom
sweep=area('sweep',(-4,-2.5,1.6),(0,0,0),.2,5,(1,.93,.85),0);aim(sweep)
for f,x,e in [(28,-4,0),(34,-3.6,900),(100,3.6,900),(108,4,0)]:
    sweep.location.x=x;sweep.keyframe_insert('location',frame=f);sweep.data.energy=e;sweep.data.keyframe_insert('energy',frame=f)
hero.rotation_euler=(0,0,math.radians(-28));hero.keyframe_insert('rotation_euler',frame=0)
hero.rotation_euler=(0,0,math.radians(4));hero.keyframe_insert('rotation_euler',frame=BOOM-1)
hero.rotation_euler=(math.radians(1.2),math.radians(-.8),math.radians(6.5));hero.keyframe_insert('rotation_euler',frame=BOOM+3)
hero.rotation_euler=(0,0,math.radians(9));hero.keyframe_insert('rotation_euler',frame=BOOM+30)
hero.rotation_euler=(0,0,math.radians(14));hero.keyframe_insert('rotation_euler',frame=END)
# light linking: only key + rimL + flash light the slate; studio panels light the glass only (keeps the floor a deep, clean black)
lit=bpy.data.collections.new('litonly')
for o in sc.objects:
    if o.name.startswith(('hero','sweep')):lit.objects.link(o)
for n in ('top','stripT','back','fill','stripF','rimR'):
    sc.objects[n].light_linking.receiver_collection=lit

sc.render.use_overwrite=False;sc.render.use_placeholder=True

sc.use_nodes=True;ct=sc.node_tree;cn=ct.nodes
rl=cn['Render Layers'];co=cn['Composite']
gl=cn.new('CompositorNodeGlare');gl.glare_type='FOG_GLOW';gl.quality='HIGH';gl.threshold=.9;gl.size=8;gl.mix=-.82
ld=cn.new('CompositorNodeLensdist');ld.inputs['Dispersion'].default_value=.012;ld.inputs['Distortion'].default_value=-.008
ct.links.new(rl.outputs['Image'],gl.inputs[0]);ct.links.new(gl.outputs[0],ld.inputs[0]);ct.links.new(ld.outputs[0],co.inputs[0])
# ================= v10 craft overrides =================
sc.render.resolution_x=1080;sc.render.resolution_y=1920;sc.render.resolution_percentage=100   # native 1080x1920
sc.cycles.samples=int(os.environ.get('SPP','64'));sc.cycles.adaptive_threshold=.03
sc.cycles.sample_clamp_direct=6.0;sc.cycles.sample_clamp_indirect=2.0;sc.cycles.blur_glossy=.3
sc.view_settings.look='AgX - Base Contrast';sc.view_settings.exposure=-0.45   # preserve specular rolloff, no blown facets
# HDRI world: low-strength reflection detail, camera sees near-black
wn=w.node_tree.nodes;wl=w.node_tree.links
env=wn.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load('/workspace/gemini-v6-review/viewer/gold-v7/studio.hdr')
hb=wn.new('ShaderNodeBackground');hb.inputs[1].default_value=float(os.environ.get('HDRI','0.12'));wl.new(env.outputs[0],hb.inputs[0])
lp=wn.new('ShaderNodeLightPath');mx=wn.new('ShaderNodeMixShader')
wl.new(lp.outputs['Is Camera Ray'],mx.inputs[0]);wl.new(hb.outputs[0],mx.inputs[1]);wl.new(bg.outputs[0],mx.inputs[2]);wl.new(mx.outputs[0],wn['World Output'].inputs[0])
# glass must mirror the studio: glossy on for key panels (floor stays protected by light linking)
for n_ in ('key','rimL','rimR','top','stripT','back','sweep'):
    if n_ in sc.objects:sc.objects[n_].visible_glossy=True
for o,_m in sbs:o.visible_glossy=True
for n_,s in (('key',.75),('back',.45),('rimL',.85)):
    L=sc.objects[n_].data
    if L.animation_data and L.animation_data.action:
        for fc in L.animation_data.action.fcurves:
            for k in fc.keyframe_points:k.co[1]*=s;k.handle_left[1]*=s;k.handle_right[1]*=s
# body: lighter absorption so knap scars + coat scratches read; thin edges stay amber
va.inputs['Density'].default_value=float(os.environ.get('DENS','750'))
p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.9,.6,.38,1)
sk.inputs['Strength'].default_value=.14;mr.inputs[4].default_value=.45;p.inputs['Coat Weight'].default_value=.85
sc.render.use_persistent_data=True
